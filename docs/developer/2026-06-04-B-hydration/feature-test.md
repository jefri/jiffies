# Feature Test — M1: FC adopt-and-hydrate on `load` + auto-marking

This is the middle-loop entry point for milestone **M1** of the hydration
design ([design.md](./design.md)). M1 is the smallest end-to-end *automatic*
slice: ship JavaScript *after* the browser has parsed and painted server HTML,
and a server-rendered custom element becomes interactive **with zero author
hydration code** — identified entirely by the `customElements` registry.

This feature test replaces the prior, now-deleted version that encoded the
removed id-registered `attach` tier (`register("counter", { attach })`,
`data-hydrate="counter"`, `data-hydrate-on="load"`). The design pivoted to a
**no-knobs** model: there is no `register`, `markHydrate`, `Hydrator`, string
id, or trigger attribute anywhere in author code. Hydratability is a side effect
of attaching behavior at the single `update()` seam.

## User Story

A page is server-rendered to static HTML. It contains a custom element —
`<hydrate-counter>` — whose server-rendered children give correct first paint,
SEO, and a no-JS fallback. The browser parses it and, because the component
module is loaded, **upgrades** it: the element's constructor runs, but its
`update()` does **not**. So the parsed element has markup but no populated
`State`, no client-built subtree, and no listeners. Clicking it does nothing.

The author wrote an ordinary FC and called **no** hydration function. After the
browser paints, a deferred script calls `start()`. `start()` scans the root for
defined custom elements, and for each one — on the `load` policy — **adopts the
upgraded server element as the live `el`** and runs `el.update()`. That runs the
genuine FC lifecycle: the render fn re-executes, `State` populates, and the FC
rebuilds its own subtree. The custom element node itself is never replaced, so
the unit boundary does not flash.

The component follows the framework's reference-holding idiom
(`src/components/virtual_scroll.ts`): its render closes over a child element it
allocated this render and calls `.update()` on that captured reference when a
handler fires. Because the FC adopted-and-rebuilt, that captured reference is the
node actually attached — so the now-live handler updates the **attached** node,
not a detached one. The counter increments.

**Given** server HTML containing `<hydrate-counter><div>Count: 0</div></hydrate-counter>`
parsed into the live document, with the component module loaded so the element
is upgraded but un-`update()`d,
**When** the runtime `start()`s over the document body,
**Then** the `load` policy adopts the live custom element, runs its lifecycle
(`State` populates, the subtree is rebuilt), and a subsequent click on the
rebuilt child runs the handler and increments the count on the attached node.

And, separately, the marking that makes a unit discoverable across the wire:

**Given** an element built through `update()` with a non-empty `[Events]` map,
**When** it is rendered,
**Then** it carries a valueless boolean `data-hydrate` attribute (which
`outerHTML` serializes for free); an element with no listeners carries none.

## Scope boundary

What this test exercises — the M1 surface only:

- `start(root)` — scan `root` for defined custom elements, adopt each, hydrate
  on `load`.
- The FC adopt path: `customElements.whenDefined` → adopt the upgraded element
  as `el` → `el.update()` (props `undefined` in M1) → render fn runs, `State`
  populates, subtree rebuilds.
- Correctness under the reference-holding idiom (design.md Metrics #4): a
  captured internal child reference updates the **attached** node.
- Auto-marking (design.md Metrics #3): `update()` stamps `data-hydrate` on a
  behavior-bearing element and omits it on an inert one.

Deliberately **not** in this test (later milestones):

- `hydrateRoot` whole-app reconcile-once and `defer-hydration` top-down
  ordering — **M2**.
- The serialized JSON data-prop channel (`<script id="__hydration">`); M1 adopts
  with `props` undefined — **M3**.
- Event capture-and-replay across the hydration gap — **M4**.
- Build/serving integration: the inline stub, the state payload, and the
  deferred client entry that imports component modules and calls `start()` —
  **M5**.
- Lazy `visible` / `idle` triggers — deferred (internal, automatic; the author
  surface does not change when they land).

There is no `register` / `markHydrate` / string id / `data-hydrate-on` anywhere
in the test, because none exists in the design.

## Executable test

[src/dom/hydrate.test.ts](../../../src/dom/hydrate.test.ts)

Two `it`s under one `describe`, both **red**:

1. The headline user story — a parsed `<hydrate-counter>` auto-hydrates on
   `start()`, its lifecycle runs, the subtree rebuilds, and the captured-child
   closure updates the attached node on click.
2. The auto-marking mechanism — `update()` stamps/omits `data-hydrate` by
   whether behavior was attached. (This lives in `dom.ts`'s `update()`, not in
   `hydrate.ts`, so it is impossible to author a handler-bearing element that is
   not also marked.)

The M1 red-green-refactor loop drives both to green.

### Why both are `{ todo: true }` and why a stub exists

This project's Stop hook runs `tsc --noEmit && node --test` and refuses to end a
turn on a red tree, re-waking on every stop until the tree is green. A plainly
failing feature test, or an unresolved import, would block the session
indefinitely. Two minimal accommodations keep the tests red while letting the
session close at this draft gate:

- [src/dom/hydrate.ts](../../../src/dom/hydrate.ts) is a **type-first contract
  stub** matching the no-knobs surface: `start` (M1) and `hydrateRoot` (M2),
  both throwing `not implemented`. It exists so the test's import resolves under
  `tsc`. No hydration logic lives there yet.
- Both tests are marked `{ todo: true }`, so `node --test` runs them, reports
  them as failing TODOs, and still exits 0 (`fail 0`, `todo N`).

**The M1 red-green-refactor loop fills in `hydrate.ts` (the `start()` FC adopt
path) and `dom.ts` (the `update()` `data-hydrate` marking), then removes the
`{ todo: true }` markers** — at which point a green run means the feature works.
Until then the tests are a recorded, runnable definition of "done."
