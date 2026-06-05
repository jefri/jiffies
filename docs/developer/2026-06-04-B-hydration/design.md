# Hydration for Jiffies DOM Components

## Problem Statement

Offline rendering ("design A", shipped as commit `516a87f`) turns a
built component tree into static HTML: correct first paint, SEO, and a no-JS
fallback, but **no behavior**. The output carries no `on*` attributes, no event
wiring, and no framework internals. The only way to make a server-rendered page
interactive today is the client bootstrap in `src/dom/form/index.html`, which
runs `document.body.appendChild(App())`. Over server-rendered HTML that
double-renders: the client builds a fresh tree and appends it beside or replaces
the server tree, causing a flash, lost focus/scroll, and a wasted first paint.
Design A names this the motivating cost and defers the fix here.

This component adds **hydration**: ship JavaScript *after* the browser has parsed
and painted the server HTML, then make that existing DOM interactive in place,
without rebuilding the whole page.

**The governing constraint of this design is that hydration has no user-facing
knobs.** There is no author-called marking function, no string-id registry, and
no per-element trigger selector. An element becomes hydratable as an automatic
consequence of having attached JavaScript behavior. In this framework "attached
behavior" has one precise meaning: a non-empty `[Events]` listener map, and that
map is written in exactly one place, the `update()` seam (`src/dom/dom.ts:133-144`).
The seam that attaches a listener is therefore the seam that records the element
as hydratable. The author writes ordinary components and never reasons about
hydration.

Two tiers, matching how the framework expresses interactivity, both automatic:

- **FC components** (custom elements) are the unit of automatic hydration. A
  custom element registers itself with the platform when `FC()` calls
  `customElements.define` (`src/dom/fc.ts:66`). The browser upgrades a parsed
  server custom element, running its constructor, but **not** its `update()`.
  Hydration closes that gap: it adopts the upgraded element as the live `el` and
  runs the genuine lifecycle. The `customElements` registry *is* the hydrator
  registry. No separate registration exists.
- **DOM components** (plain tag functions) have no standalone hydration path of
  their own, because a plain handler is a closure and a closure cannot cross the
  wire. Their behavior is recreated by re-running the code that produced it: the
  enclosing FC when it rebuilds its subtree, or the whole-app `hydrateRoot` when
  it re-runs the page render and reconciles once onto the server DOM.

Making a runtime, compiler-less, reference-holding framework hydrate correctly
imposes **constraints on what JavaScript is supported** (determinism,
serializable data props, where closures may come from). Naming those constraints
is part of the deliverable, not a footnote.

## Prior Art

### In this repository

- **The single construction and behavior seam.** Every tag function is
  `up(window.document.createElement(name), attrs, ...children)`
  (`src/dom/html.ts:3-13`); the FC ctor uses the same `createElement`
  (`src/dom/fc.ts:72`). `up()` calls `update()` (`dom.ts:89-95`), and `update()`
  is the one place listeners are written: it walks `attrs.events` and calls
  `setListener`, which records each handler in the element's own `Symbol(events)`
  map (`dom.ts:103-114`, `dom.ts:133-144`). Because there is exactly one seam
  where behavior is attached, there is exactly one place to record, automatically,
  that an element is hydratable. This single seam is what makes a no-knobs design
  reachable.
- **`src/dom/render.ts` — serialization is attribute-only.** `renderToString`
  emits `el.outerHTML` (`render.ts:14`). The `[Events]` map is a private
  `Symbol`-keyed property (`dom.ts:18`) and is invisible to `outerHTML`. So
  attached behavior never serializes by itself: a real attribute must carry the
  hydratable signal across the wire. A boolean attribute stamped on the element
  inside `update()` is carried by `outerHTML` for free, with no build-time tree
  search and no author call.
- **`src/dom/fc.ts` — the FC lifecycle and self-registration.** `FC(name, render)`
  calls `customElements.define(name, FCImpl)` (`fc.ts:66`). `update()` writes
  `#attrs`/`#children`, re-runs the render fn, and reconciles its children
  (`fc.ts:41-63`). The `State` symbol is **not** written by `update()`: it is a
  class field (`fc.ts:37`) populated by the render fn itself (e.g.
  `inline_edit.ts:22`). The ctor does `createElement(name)` then
  `element.update(...)` (`fc.ts:68-78`). When the browser parses a server
  `<inline-edit>` and `customElements.define` later runs, the element is
  **upgraded** (the constructor runs) but `update()` does **not**. A parsed FC has
  markup but no listeners, no props, no state. Hydration runs the missing
  `update()`.
- **`src/dom/dom.ts` — the reconcile/patch machinery (commits `edbaefe`,
  `197449e`).** `reconcileChildren` reuses mounted nodes by identity, then by
  positional same-tag, and `patchNode` transfers a fresh node's `[Events]` map
  onto the kept node (`dom.ts:350-387`). This is the substrate for the whole-app
  `hydrateRoot` reconcile. It is also the source of the central hazard: positional
  reuse **keeps the mounted node and discards the fresh one** (`dom.ts:296-302`),
  so any closure that captured the fresh node is left pointing at a detached
  object. This hazard is why the FC tier rebuilds its own subtree, and why the
  whole-app tier carries constraint #4.
- **The reference-holding idiom.** Components capture an element reference in a
  closure and call `.update()` on it later: `inline_edit.ts:41-47` closes over
  `el`; `virtual_scroll.ts:155-173` closes over `viewportElement`. The README
  frames FC as exactly this, "capture HTML chunks and update them"
  (`src/dom/README.md:57-72`). Both are **FC-path captures**: the closed-over
  reference lives inside an FC's own render. They are the direct motivation for FC
  adopt-and-rebuild (the FC adopts its live `el` and rebuilds its subtree so every
  captured reference is a node actually inserted).
- **Offline rendering (design A).** Emits `<route>/index.html`, lists
  "Hydration and islands" as the natural next design, and documents the
  client-double-render flash as the cost this work removes. Its page-module
  contract is the seam this design extends for the client entry.
- **Server JS delivery.** `src/server/http/typescript.ts` ships TS-transpiled-to-JS
  on the fly; `static.ts` serves files. The hydration module and its inline stub
  are delivered through these unchanged.

### External patterns (and how each lands here)

- **React replay hydration** — `hydrateRoot` walks server DOM and attaches
  listeners instead of creating nodes; the client render must match the server
  structurally or React 18 throws and re-renders. Listeners are delegated at the
  root, enabling discrete-event *replay* across the hydration gap. This is the
  shape of this design's whole-app tier.
  ([react-hydration-error](https://nextjs.org/docs/messages/react-hydration-error))
- **Astro islands** — static HTML by default; interactive components hydrate
  independently. **Props to an island are serialized as JSON**; functions cannot
  be passed, because a server closure cannot be made executable on the client.
  This is constraint #2 below, and the reason a plain-DOM handler has no
  standalone hydration path here. Astro exposes a `client:*` directive as the
  author knob; this design has none, because the `customElements` registry plus
  attached-behavior detection make the island boundary automatic.
  ([islands](https://docs.astro.build/en/concepts/islands/),
  [framework-components](https://docs.astro.build/en/guides/framework-components/))
- **Qwik resumability** — serializes listeners (`on:click="./chunk.js#handler"`),
  state, and framework state into HTML; a <1kB global `qwikloader` attaches one
  delegated listener and lazy-loads the closure on first interaction. Eliminates
  replay but requires build-time closure extraction. The event stub here borrows
  its capture-and-replay shape; full resumability is deferred.
  ([resumable](https://qwik.dev/docs/concepts/resumable/),
  [qwikloader](https://qwik.dev/docs/advanced/qwikloader/))
- **lit-ssr `defer-hydration`** — a server-rendered attribute that holds a nested
  custom element back until its parent releases it, decoupling element-definition
  order from hydration order (top-down). Adopted for ordering, but emitted
  automatically by the serializer on nested custom elements, not by the author.
  ([defer-hydration protocol](https://github.com/webcomponents-cg/community-protocols/issues/16),
  [custom-element upgrade order](https://github.com/WICG/webcomponents/issues/737))

## Metrics

The deployed design is operating acceptably when:

1. **No flash, no lost shell.** The painted static shell, and any node kept by the
   `hydrateRoot` reconcile, is **never** detached: focus, scroll position, and
   selection survive there across hydration. A hydrating FC replaces its **own**
   server subtree exactly once (a localized swap, not a page reflow), so the page
   does not flash and shell state is not lost. DOM state *inside* a hydrating FC
   subtree survives only if carried in the FC's props or `State` (constraint #5).
   Measured by: shell node identity is stable across hydration, a focused shell
   input stays focused, and document scroll position is unchanged.
2. **Behavior is automatic, with no author hydration code.** A component author
   writes ordinary FC and DOM components and calls no marking or registration
   function. After hydration, an FC responds to interaction and re-renders via its
   own lifecycle, and a `hydrateRoot` page is fully interactive. There is no
   `register`, `markHydrate`, `Hydrator`, or string id anywhere in author code.
3. **Marking is a side effect of behavior, not a decision.** Any element that
   leaves the `update()` seam with a non-empty `[Events]` map carries the
   `data-hydrate` marker in its serialized HTML, and an element with no attached
   behavior does not. Measured by: rendering a handler-bearing element to string
   yields `data-hydrate`; rendering an inert element does not.
4. **Correct under the reference-holding idiom.** A hydrated FC whose render
   closes over an internal element reference (the `virtual_scroll` shape) updates
   the *attached* node, not a detached one. Asserted by a test built on that exact
   pattern.
5. **Determinism is enforced, not assumed.** A structural mismatch between server
   HTML and client render is detected and reported (console plus a mismatch hook),
   and degrades to a localized rebuild rather than a silent wrong-DOM bind.
6. **No event lost to the gap.** An interaction dispatched after paint but before
   a unit hydrates is replayed once that unit hydrates.
7. **State crosses safely.** The serialized state payload round-trips
   `JSON`-supported data and is escaped so no payload value can break out of the
   `<script>` context.
8. **Zero new runtime dependencies.** Hydration uses the existing DOM, the
   existing `update()`/`[Events]` path, `customElements`, and (for deferred lazy
   triggering) `IntersectionObserver`/`requestIdleCallback`. All platform APIs.

## Specification

This design is an ensemble spanning five milestones (M1-M5). **M1's mechanism is
specified to implementation depth; M2-M5 are specified to roadmap depth** and each
is refined in its own feature-test → plan → implement cycle.

### Core mechanism: automatic marking at the behavior seam

There is no author-facing marking step. Hydratability is recorded as a side effect
of attaching behavior:

- **Plain elements.** After `update()` processes `attrs.events` (`dom.ts:136-144`),
  if the element's `[Events]` map is non-empty it stamps a **valueless boolean
  attribute** `data-hydrate` on the element. The attribute carries no id and no
  options. `renderToString`/`outerHTML` (`render.ts:14`) carries it into the HTML
  with no build-time tree search and no author call. An element with no listeners
  is never stamped.
- **FC components.** A custom element is identifiable by being a defined custom
  element: its hyphenated tag name resolves in `customElements`. That registry
  membership, established by `FC()`'s `define` call, is its hydratable signal. The
  serializer additionally emits `defer-hydration` on nested custom elements so the
  enclosing unit can release them in top-down order (below). The FC custom element
  is the **boundary** of a hydration unit; markers stamped on its rebuilt children
  are inert for unit discovery (the FC owns and rebuilds that subtree).

A **hydration unit** is the outermost hydratable boundary the scan reaches: a
defined custom element (an FC), or, in the whole-app path, a `data-hydrate`-marked
plain element that is not inside any FC. The scan never descends into a custom
element; each FC hydrates its own subtree.

### Public API — `src/dom/hydrate.ts`

The author surface is two functions. Neither takes an id, a hydrator, or a
trigger.

```ts
/** Scan `root` for hydration units (defined custom elements, and `data-hydrate`
 *  plain elements outside any FC) and hydrate each on the `load` policy: hydrate
 *  immediately after the scan. `root` defaults to `window.document.body`.
 *  Idempotent: a unit already hydrated is skipped. */
export function start(root?: ParentNode): void;

/** Whole-app page: re-run `render`, reconcile ONCE into `mount` (flash-free),
 *  grafting handlers onto kept server nodes via the existing reconcile/patch
 *  path. The reconcile stops at custom-element boundaries; each FC hydrates
 *  itself. Plain-DOM handlers in this path are subject to constraint #4. (M2) */
export function hydrateRoot(mount: Element, render: () => Node | Node[]): void;
```

The marking side effect lives in `dom.ts`'s `update()`, not in `hydrate.ts`, so it
is impossible to author a handler-bearing element that is not also marked. Internal
to `hydrate.ts`, a non-exported `hydrate(el)` hydrates one discovered unit (used by
`start`, by the deferred lazy triggers, and by replay). It is not a knob.

### M1 — FC adopt-and-hydrate

`start()` discovers each defined custom element under `root` and, for each, runs the
adopt path:

1. `await customElements.whenDefined(localName)` so the class exists before adopt;
   `defer-hydration` on nested units keeps children from self-acting until released.
2. **Adopt the upgraded server custom element as the live `el`.** The parsed element
   already exists in the DOM and has been upgraded (its constructor ran). Hydration
   does not create a replacement.
3. Run `el.update(props)` (props is `undefined` in M1; the data channel is M3). This
   is the genuine FC lifecycle: the render fn re-executes, `State` and private fields
   populate, and the FC reconciles its children.

One deliberate departure from reusing server DOM: **FC hydration rebuilds the FC's
own subtree.** The server-rendered children of an FC are first-paint/SEO only; on
hydration the FC clears and re-renders them. This is required for correctness, not
convenience. The framework's idiom closes over internal element references
(`virtual_scroll`'s `viewportElement`), and `reconcileChildren` discards the fresh
node while keeping the mounted one, which would leave that closure bound to a
detached node. Adopting `el` (so `el`-capturing closures are live) and rebuilding the
subtree (so internally-captured node references are the nodes actually inserted)
makes the whole lifecycle correct. The cost is a single localized subtree swap per
FC at hydration time. The static shell's first paint is untouched.

This is the smallest end-to-end automatic slice: ship JS after paint, and a
server-rendered custom element becomes interactive with zero author hydration code,
identified entirely by the `customElements` registry.

### Whole-app pages — `hydrateRoot` (M2)

For pages that are one interactive application, `hydrateRoot(mount, () => App())`
re-runs the root render and **reconciles once** into the mount via
`reconcileChildren`: server DOM is kept, handlers are grafted onto kept nodes by
`patchNode`, no flash. This is how plain-DOM behavior is recreated: not by an id
lookup, but by re-running the code that produced the closures.

The reconcile treats every custom element (an FC unit) as an **opaque leaf**: it
keeps the element node by identity / positional same-tag but does **not** recurse
into its children. Those subtrees are owned by their own FC adopt-and-rebuild, fired
by `start`. This requires `hydrateRoot` to use a reconcile variant that **stops at
custom-element boundaries** rather than the default `patchNode` recursion;
recursing in would fight each FC's self-rebuild over the same children.

Plain-DOM handlers grafted in this path are subject to constraint #4.

### Ordering — `defer-hydration`

Ordering follows lit's protocol: a server-nested FC carries `defer-hydration` (emitted
automatically by the serializer, not the author); the enclosing unit removes it after
adopting, so parents hydrate before children regardless of custom-element upgrade
order. (M2.)

### Triggers

The only trigger policy is `load`: `start()` hydrates each discovered unit
immediately after the scan. There is no author-facing `data-hydrate-on`.

`visible` (`IntersectionObserver`) and `idle` (`requestIdleCallback`) lazy
triggering are a **deferred internal optimization**: when added, the runtime
decides per unit with no author input, and the author surface does not change.
They are deliberately out of the milestone sequence below and listed under Deferred.

### State channel (M3)

FC props that are plain data may need to cross server → client so a client adopt runs
`el.update(props)` with the same inputs the server used. This travels in one
page-level payload:

```html
<script type="application/json" id="__hydration">
  { "<unit-key>": { /* JSON-serializable data props */ }, … }
</script>
```

The payload is an **internal, automatic** mechanism. The key is **derived** by the
runtime (the unit's position in the document order of discovered units), never an
author-chosen id, and there is no author-facing `hydrationState()` accessor: the
runtime reads the payload for a unit during `start`/adopt and passes it to
`el.update(props)`. The build escapes payload values (`<`→`&lt;`, `>`→`&gt;`,
`&`→`&amp;`, and `</`-sequence neutralization) to close the `</script>` and
comment-breakout XSS class, a real CVE family
([CVE-2026-27902](https://cvereports.com/reports/CVE-2026-27902),
[JSON.stringify XSS](https://pragmaticwebsecurity.com/articles/spasecurity/json-stringify-xss)).
Whole-app pages recreate props by re-running `App()`, so they may need no payload at
all; the payload exists for FC islands that hydrate without a full root re-run.

### Event capture-and-replay — the hydration gap (M4)

A tiny **inline** stub runs before the hydration module, so it is active at first
paint:

- Installs one capture-phase listener per configured event type
  (`click`, `input`, `change`, `submit`, `keydown`, …) on `document`.
- When an event targets a not-yet-hydrated unit (a custom element, or a
  `data-hydrate` element), it records `{ type, targetPath, eventInit }` in a global
  queue and, for default-prevented-safe types, suppresses the default to avoid a
  half-action. `targetPath` is a **child-index path**: the array of `childNodes`
  indices from the unit's boundary element down to the event target.
- After a unit hydrates, the runtime drains queued events whose target lies within
  it, resolves each `targetPath` by walking the same indices from the boundary, and
  re-dispatches on the resolved live node.

For FC units whose subtree is rebuilt, the rebuilt tree may not match the captured
path, so replay there is **best-effort**: if the path does not resolve, drop the
event and log. This is React's discrete-event-replay shape and Qwik's qwikloader
shape, scaled to this framework.

### Constraints on supported JavaScript

These are the cost of hydration and must be documented for component authors:

1. **Deterministic render.** A render must produce the same tree from the same
   inputs on server and client. No `Date.now()`, `Math.random()`, locale/timezone
   reads, or `typeof window` branching *during render*. This is the universal
   hydration-mismatch class.
   ([react-hydration-error](https://nextjs.org/docs/messages/react-hydration-error))
2. **Closures come from re-running client code, never from the wire.** Only
   `JSON`-serializable data crosses server → client (plain objects, numbers,
   strings, arrays; not functions). A plain-DOM handler has no standalone hydration
   path because of this: it is recreated by re-running its producer, the enclosing
   FC's render or the whole-app `hydrateRoot`. FC islands define their handlers
   *inside* the component.
   ([astro framework-components](https://docs.astro.build/en/guides/framework-components/))
3. **FC subtrees are rebuilt on hydration.** Do not rely on server-built FC children
   surviving by identity; the server children are first paint only.
4. **Plain-DOM handlers act through `event.target`/`event.currentTarget`/`el`, not
   captured-and-mutated sibling references.** This is a constraint of the
   `hydrateRoot` reconcile mechanism: the reconcile keeps the server node and
   discards the fresh client one (`dom.ts:296-302`), so a handler grafted via
   `patchNode` that closes over a *fresh sibling* node binds to a detached object.
   Logic that must hold an internal element reference across renders belongs in an
   FC (whose `el` is adopted live).
5. **FC-internal DOM state must be driven from `State`/props to survive hydration.**
   The FC subtree rebuild (constraint #3) discards live DOM state in the
   server-rendered children that is not represented in serializable props or
   `State`: uncontrolled input values typed before hydration, inner scroll position,
   media playback position, IME composition. Restore such state from `State` after
   render rather than reading the live DOM, the pattern `virtual_scroll.ts:162-164`
   follows when it restores the viewport scroll position from `state`
   (`viewportElement.scroll({ top: state.scrollTop })`).

### Build / serving integration (M5)

The `data-hydrate` and `defer-hydration` attributes are **not** placed by a build
tree-search. `data-hydrate` is already on each handler-bearing node, stamped by
`update()` during render, so design A's existing `outerHTML` serialization carries it
into the HTML for free. The build never searches the opaque `Node` tree for hydration
sites.

The offline-rendering build (design A) gains a hydration pass whose remaining job is,
per page, to: collect discovered units' data props into the `<script id="__hydration">`
state payload (escaped as in M3), emit `defer-hydration` on nested custom elements,
inject the inline capture stub, and inject a deferred `type="module"` script. **That
deferred module is the client entry: it imports the same component modules the page
used, which runs their `FC()`/`customElements.define` calls as a side effect (this is
the entire "registration"), and then calls `start()`.** The page-module contract from
design A therefore gains, in place of an id→hydrator manifest, an optional client-entry
export that names the component modules to import. There is no id namespace and no
per-unit `kind` declaration: the tier is determined at runtime by whether the unit is a
custom element (FC adopt) or a plain marked node inside a `hydrateRoot` page.

### Failure modes

- **Structural mismatch.** Server HTML and client render disagree (a violated
  constraint #1). Detected when an FC adopt finds a tag it did not expect, or when
  positional same-tag reuse **fails at the unit boundary's direct children** (the
  client render's child tag sequence diverges from the server's). Response: log with
  the unit's derived key, fire a `mismatch` hook, and rebuild that unit locally (a
  flash limited to the unit). Never silent.
- **Custom element module not loaded.** The client entry did not import the module
  that defines a parsed custom element, so `customElements.whenDefined` never
  resolves and the element stays static. Fail-soft; the server markup remains as
  content. (A diagnostic logs units left un-upgraded after `start`.)
- **Custom element not yet defined at hydration.** `await
  customElements.whenDefined(name)` before adopt; `defer-hydration` keeps children
  from self-acting in the meantime.
  ([whenDefined](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/whenDefined))
- **Un-serialized FC-internal DOM state at rebuild.** The FC subtree rebuild discards
  live DOM state (uncontrolled inputs, inner scroll, media position, IME composition)
  not carried in `State`/props. Fail-soft, but real data loss; authors must
  reconstruct it from state (constraint #5).
- **Event replayed into a unit that mismatched and rebuilt.** Replay targets by path
  within the unit; if the path no longer resolves, drop the event and log.

### Verification

- **Automated (`node --test`, jsdom):** each test is tagged with the milestone whose
  feature-test cycle owns it.
  - **M1:** a parsed server custom element auto-hydrates on `load` after `start()`:
    `update()` runs (state/props populate, children rebuild), node interaction
    triggers a re-render, and a `virtual_scroll`-shaped closure updates the
    *attached* node (metric #4). No `register`/`markHydrate` appears in the test.
    Also: `update()` stamps `data-hydrate` on a handler-bearing element and omits it
    on an inert one (metric #3).
  - **M2:** `hydrateRoot` reconciles without detaching the shell (assert node identity
    of a focused input survives); the reconcile stops at custom-element boundaries;
    `defer-hydration` enforces parent-before-child order.
  - **M3:** the state payload round-trips `JSON`-supported data, rejects an
    injection-bearing value, and the derived key resolves a unit's props at adopt.
  - **M4:** the capture stub queues an event on a not-yet-hydrated unit and the
    runtime re-dispatches it after hydration; an unresolved path drops and logs.
  - **M5:** the build emits the inline stub, the state payload, and a client entry
    that imports component modules and calls `start()`; a built page round-trips to an
    interactive document.
- **Manual:** build a page with design A, open it, confirm content paints with JS
  disabled; enable JS, confirm no flash and that scroll/focus survive; throttle the
  network, click before hydration, confirm the click replays once live.

## Alternatives

- **Author-marked, id-registered hydration (the prior draft of this design).** A
  public `markHydrate(node, id, opts)` marks nodes during render, `register(id,
  hydrator)` records a client `Hydrator` per id, and `data-hydrate="<id>"` plus a
  page manifest connect them. **Rejected:** every one of those is a user-facing knob,
  and the framework does not need them. Behavior is already centralized at the single
  `update()` seam, so marking can be a side effect; FC components already register
  themselves through `customElements.define`, so the id registry is redundant; and a
  plain-DOM handler has no id-addressable client form anyway, because its closure
  cannot cross the wire. The id machinery added an author burden and an entire failure
  mode ("hydrator not registered") for no capability that the automatic mechanisms do
  not provide.
- **Whole-page claiming (Solid/Svelte style).** A hydration cursor makes the
  construction seam return the next server node instead of `createElement`.
  **Rejected:** Solid/Svelte are compilers that emit a top-down hydration walk. This
  framework composes at runtime and JS evaluates arguments bottom-up: in
  `div(span(), p())` the children construct before `div` is called, so a
  document-order cursor mis-pairs on any nested same-tag element (`div(div())` claims
  inner→outer; the DOM is outer→inner). Not reliably reachable without a build step
  the framework does not have.
- **Reconcile everywhere with no FC special-casing.** Build a fresh client tree and
  reconcile against server DOM uniformly. **Rejected as the uniform mechanism:**
  `reconcileChildren` keeps the mounted node and discards the fresh one, so the
  reference-holding idiom (`virtual_scroll`'s captured `viewportElement`) binds to a
  detached node. The FC adopt-and-rebuild path exists precisely to avoid this.
  Reconcile *is* used, correctly, for the whole-app `hydrateRoot` where plain-DOM
  handlers obey constraint #4.
- **Resumability (Qwik style).** Serialize listeners and state into HTML; resume with
  zero replay. **Rejected for now:** requires build-time closure extraction and a full
  state-serialization format the framework lacks. It is the long-term north star for
  eliminating replay; noted as deferred.
- **Off-the-shelf SSR/hydration (Next, Astro, lit-ssr).** **Rejected:** each hydrates
  its own component model, not the reentrant real-DOM components here, and contradicts
  the zero-dependency premise, the same reasoning design A gave.

## Summary

Add automatic, knob-free hydration. Marking is a side effect of the one seam that
attaches behavior: `update()` stamps a boolean `data-hydrate` on any element that
leaves with a non-empty `[Events]` map, and `outerHTML` carries it for free. FC
components are the unit of automatic hydration, identified by the `customElements`
registry that `FC()` already populates; hydration adopts the upgraded server element
as `el` and runs its real lifecycle, rebuilding its own subtree so the framework's
reference-holding idiom stays correct. Plain-DOM behavior has no standalone path,
because closures cannot cross the wire; it is recreated by re-running its producer,
the enclosing FC or the whole-app `hydrateRoot` reconcile-once. The author writes
ordinary components and calls only `start()` (or `hydrateRoot()` for a whole-app page).
There is no `register`, `markHydrate`, `Hydrator`, string id, or trigger selector.

**Sequenced milestones** (each its own feature-test → plan → implement cycle; see
`TODO.md`):

- **M1** — FC adopt-and-hydrate via the `customElements` registry, `load` trigger,
  and the `update()` auto-marking side effect. *(next session's target.)*
- **M2** — `hydrateRoot` whole-app reconcile-once (constraint #4) + reconcile that
  stops at custom-element boundaries + `defer-hydration` ordering.
- **M3** — internal serialized JSON data-prop channel, keyed by a derived unit key,
  escaped.
- **M4** — event capture-and-replay buffer across the gap.
- **M5** — offline-rendering / SSG integration: inline stub, state payload, and a
  deferred client entry that imports component modules (running their `define` calls)
  and calls `start()`.

**Deferred decisions:**

- **Lazy `visible`/`idle` triggers** — internal, automatic, no author knob; the
  runtime decides per unit. Moved out of the milestone sequence at the request that
  the baseline be `load` with visible as a later task.
- **Resumability** — serialized listeners + state with no replay; the long-term
  successor to replay hydration, gated on a build step and a serialization format.
- **Per-route code splitting of client entries** — one module per page vs shared
  chunks; an optimization over M5's single deferred module.
- **Selective/partial root hydration** — hydrating a whole-app root in priority order
  rather than one `hydrateRoot` pass.
- **Hydration of `head`/metadata and streaming** — out of scope; this design targets
  `body` interactivity over design A's static output.
