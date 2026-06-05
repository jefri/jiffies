# Implementation Plan: M1 — FC adopt-and-hydrate on `load` + auto-marking

**Feature test:** `src/dom/hydrate.test.ts`
**User story:** A server-rendered FC custom element becomes interactive after
`start()` runs — with zero author hydration code — because `customElements`
registration IS the unit registry; and any element built with live listeners is
automatically stamped `data-hydrate` by `update()`.

**Steps:**
- [ ] Step 1: Auto-mark behavior-bearing elements in `update()` (`dom.ts`)
- [ ] Step 2: `scanUnits()` — depth-first FC discovery helper (`hydrate.ts`)
- [ ] Step 3: `start()` — adopt-and-hydrate each scanned unit (`hydrate.ts`)

No **Step 0**: no new domain objects. `Element[Events]`, `State`, and
`FCComponent` already exist; the work is behavior added at the `update()` seam
and behind the `start()` signature.

---

## Step 1: Auto-mark behavior-bearing elements in `update()`

**File:** `src/dom/dom.ts`

**Enables:** `hydrate.test.ts` — the second `it` (auto-marking). After this
step, remove `{ todo: true }` from that test and confirm it goes green.

After the events loop in `update()` finishes modifying `$events`, stamp or
clear the `data-hydrate` boolean attribute on `element` based on whether any
live listeners remain. The mark is a valueless boolean — present means
"this element has behavior"; absent means inert — so `outerHTML` serializes it
for free.

```ts
/**
 * Stamp `data-hydrate` when this element carries live listeners after update;
 * remove it when none remain. The presence of this attribute is the only signal
 * the hydration runtime needs — no author code sets or reads it directly.
 *
 * Invariant: the attribute reflects `$events.size` at the END of the events
 * loop, not at entry, so a `null`-valued event that drops the last listener
 * also removes the mark in the same update() call.
 */
// element.toggleAttribute("data-hydrate", $events.size > 0);
```

**Invariants:**
- The attribute is set/cleared inside `update()` — never by author code,
  never by `hydrate.ts`. It is impossible to attach a handler without being
  marked, and impossible to be marked without a live handler.
- `patchNode()` already diffs and copies attributes from fresh → kept, so a
  reused node's mark tracks its listeners through reconciliation without extra
  work.

---

## Step 2: `scanUnits()` — depth-first FC discovery

**File:** `src/dom/hydrate.ts`

**Enables:** no assertion directly — this is the internal primitive that
Step 3's `start()` calls. Adding it in isolation keeps Step 3 a single small
change.

Add a module-private function that walks `root`'s element subtree depth-first,
collects every element whose `localName` is a defined custom element, and does
**not** recurse into matched elements (each FC hydrates its own subtree; its
inner custom elements, if any, are its responsibility).

```ts
/**
 * Walk `root` depth-first, returning every element whose localName is a
 * defined custom element. Does NOT descend into matched elements — each FC
 * owns its own subtree hydration; inner FCs are units in their own right and
 * will be reached by their parent's `el.update()`, not by `start()`.
 *
 * `customElements.get(localName)` is the membership test: no hyphen heuristic,
 * no data attribute, no registry separate from the platform's own.
 */
function scanUnits(root: ParentNode): Element[];
```

After this step `start()` still throws. The scan helper is ready for Step 3.

**Invariants:**
- Pure traversal — no DOM mutations, no side effects.
- A matched element is collected and its subtree is skipped; an unmatched
  element's children are walked but the element itself is not collected.
- Module-private; only `start()` (and, later, `hydrateRoot()`) call it.

---

## Step 3: `start()` — adopt-and-hydrate each scanned unit

**File:** `src/dom/hydrate.ts`

**Enables:** `hydrate.test.ts` — the first `it` (FC adopt-and-hydrate). After
this step, remove `{ todo: true }` from that test and confirm it goes green
(both tests must be green with no `{ todo: true }` markers remaining).

Replace the `throw` body in `start()` with a call to `scanUnits`, then for each
unit schedule hydration via `customElements.whenDefined`. `whenDefined` returns
a promise that resolves immediately for an already-defined element (microtask),
so the test's `await tick()` — one `setTimeout(0)` macrotask — ensures all
units are hydrated before the assertions run.

Calling `el.update()` with no arguments runs the FC lifecycle: the render fn
re-executes, `State` initialises, the subtree rebuilds from scratch, and
handlers attach. The element node itself is never replaced — `update()` in
`fc.ts` calls `reconcileChildren` on `this`, not `replaceWith`. The server
children are overwritten by the freshly-rendered subtree, closing the
captured-reference hazard (Metrics #4): the render's fresh child IS the
attached node.

```ts
/**
 * Scan `root` for FC units (defined custom elements) and hydrate each on the
 * `load` policy: schedule `el.update()` via `customElements.whenDefined` so
 * the call runs after any pending upgrades settle. `root` defaults to
 * `window.document.body`.
 *
 * The scan never descends into a matched element; each FC hydrates its own
 * subtree when its own `update()` runs.
 *
 * Idempotent across repeated `start()` calls: `update()` on an already-live
 * FC is a re-render, not a double-hydration — the FC's own `State` and
 * `#attrs` survive because `update()` merges onto them (see fc.ts). A
 * `WeakSet` guard can be added in a later step if idempotence must be
 * exact-once rather than re-render-safe.
 */
export function start(root?: ParentNode): void;
```

After implementing and removing both `{ todo: true }` markers, `node --test`
must exit 0 with `pass 2, fail 0, todo 0` for the `hydrate` suite.

**Invariants:**
- The element node returned by `document.querySelector` before and after
  `start()` is the same object — identity is preserved (Metrics #1: no flash
  at the unit boundary).
- `el.update()` is the genuine FC lifecycle entry point (from `fc.ts`), not
  the plain `dom.ts` `update()` — calling it on the live custom-element node
  populates `State`, runs the render fn, and replaces server children with the
  client-rendered subtree.
- `whenDefined` is the correct await even when the element is already defined:
  it resolves on the next microtask, which is before the `setTimeout(0)` the
  test flushes.

---

## Out of M1

Held for later milestones:

- `hydrateRoot` whole-app reconcile-once + `defer-hydration` ordering — **M2**.
- Serialized JSON data-prop channel (`<script id="__hydration">`) — **M3**.
- Event capture-and-replay across the hydration gap — **M4**.
- Build/SSG integration: inline stub, state payload, deferred client entry — **M5**.
- Lazy `visible` / `idle` triggers — deferred (internal; author surface is
  unchanged when they land).
