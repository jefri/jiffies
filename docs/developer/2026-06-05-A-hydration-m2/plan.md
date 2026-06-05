# Implementation Plan: Hydration M2 — `hydrateRoot` Whole-App Reconcile

**Feature test:** `src/dom/hydrate.test.ts` — `describe("hydrate — M2: hydrateRoot whole-app reconcile")`
**User story:** `hydrateRoot(mount, render)` reconciles a server-rendered shell once in place — keeping node identity, stopping at FC boundaries, and enforcing parent-before-child ordering via `defer-hydration`.

**Steps:**
- [ ] Step 1: `patchNode` skips child recursion for custom elements
- [ ] Step 2: `hydrateRoot` — reconcile pass
- [ ] Step 3: `hydrateRoot` — `startHydrate` post-reconcile pass

---

## Step 1: `patchNode` skips child recursion for custom elements

**File:** `src/dom/dom.ts` — `patchNode`

**Enables:** Test 2 assertion — `querySelector("#server-child")` is the same node after `hydrateRoot`.

The final line of `patchNode` currently recurses into every kept node's children:

```typescript
reconcileChildren(kept, Array.from(fresh.childNodes));
```

Add a guard before that line:

```typescript
// Custom elements own their own subtrees; the FC's update() reconciles its
// children via start(). Recursing here would overwrite server children that
// the FC is still responsible for — violating the opaque-leaf contract.
if (customElements.get(kept.localName)) return;
reconcileChildren(kept, Array.from(fresh.childNodes));
```

Detection: `customElements.get(kept.localName)` returns the registered constructor
when the element is a defined custom element, and `undefined` otherwise. The surface
of the custom element (attributes, listeners) is still patched by the lines above
this guard — only child recursion is skipped.

**Invariants:**
- Attribute sync (including `defer-hydration` removal) still runs before the guard.
  This is load-bearing for Step 3: the outer FC's `patchNode` call on the inner
  counter strips `defer-hydration` as a surface-attribute change, not a child
  recursion.
- Plain elements are unaffected (`customElements.get` returns `undefined`).
- `patchNode` is called from `reconcileChildren`'s positional-same-tag pass and
  nowhere else; the guard applies to both `hydrateRoot`'s reconcile and FC `update()`
  reconcile paths uniformly.

---

## Step 2: `hydrateRoot` — reconcile pass

**File:** `src/dom/hydrate.ts` — `hydrateRoot`

**Enables:** Test 1 (focused input node identity survives) and Test 2 (FC kept as
opaque leaf, server child untouched). Both assertions are synchronous — no `start()`
or tick needed.

Replace the `throw` body with:

```typescript
export function hydrateRoot(
  mount: Element,
  render: () => Node | Node[],
): void {
  const fresh = [render()].flat() as Node[];
  reconcileChildren(mount, fresh);
}
```

`[render()].flat()` normalizes both the single-node and array-of-nodes return shapes
to `Node[]`. The existing `reconcileChildren` then:

- Pass 1 (identity): server nodes already in `mount` that appear in `fresh` by
  reference stay attached.
- Pass 2 (positional same-tag): a fresh `<form>` reuses the mounted `<form>` —
  `patchNode` syncs attributes/listeners and recurses into children, keeping the
  `<input>` node by the same positional pass. Focus is never lost.
- For custom elements (Step 1): positional same-tag reuse runs `patchNode` which
  syncs the surface but stops before child recursion — the FC's server subtree is
  never touched.

`reconcileChildren` must be imported in `hydrate.ts` (it is currently not imported
there). Add it to the import from `"./dom.ts"`.

**Invariant:** `hydrateRoot` does NOT call `start()` yet — FC adopt runs in Step 3.
Tests 1 and 2 verify the synchronous reconcile only; `start()` would schedule async
microtasks that could interfere with the synchronous assertions.

---

## Step 3: `hydrateRoot` — `startHydrate` post-reconcile pass

**File:** `src/dom/hydrate.ts`

**Enables:** Test 3 — `defer-hydration` stripped from the inner FC, inner FC's
`[State].count === 0`.

The existing `start()` calls `el.replaceChildren()` before `el.update()` — this is
correct for M1 (the render fn's captured child references must point at the actually
attached nodes). For M2, the outer Wrapper's `update()` must reconcile ONTO the
existing server children so that `patchNode` can sync `defer-hydration` off the
inner counter. Clearing first would detach `inner` before the sync runs.

Add a private `startHydrate(root)` function:

```typescript
// Like start(), but omits replaceChildren() so the FC's update() reconciles
// onto existing server children — enabling patchNode to strip defer-hydration
// from nested FCs as a surface-attribute sync rather than a child replacement.
// Recurses into each hydrated FC so parent-before-child ordering is preserved.
function startHydrate(root: ParentNode): void {
  for (const el of scanUnits(root)) {
    customElements.whenDefined(el.localName).then(() => {
      el.update();
      startHydrate(el);
    });
  }
}
```

Wire it into `hydrateRoot`:

```typescript
export function hydrateRoot(
  mount: Element,
  render: () => Node | Node[],
): void {
  const fresh = [render()].flat() as Node[];
  reconcileChildren(mount, fresh);
  startHydrate(mount);
}
```

**Ordering trace for Test 3:**
1. `reconcileChildren(body, [freshWrapper])` — positional match → `patchNode(serverWrapper, freshWrapper)` → custom element: sync surface, skip children. `serverWrapper`'s children (`serverDiv > serverCounter[defer-hydration]`) are untouched.
2. `startHydrate(body)` — `scanUnits` finds `serverWrapper` (stops at FC boundary; inner counter is inside the FC subtree).
3. `serverWrapper.update()` (no clear) — render fn returns `div(Counter({}))` = `freshDiv2` containing `freshCounter2` (no `defer-hydration`). `reconcileChildren(serverWrapper, [freshDiv2])` → positional match → `patchNode(serverDiv, freshDiv2)` → plain, recurse → `reconcileChildren(serverDiv, [freshCounter2])` → positional match → `patchNode(serverCounter, freshCounter2)` → **custom element: sync surface (removes `defer-hydration`), skip children**. `inner.hasAttribute("defer-hydration")` is now false.
4. `startHydrate(serverWrapper)` — `scanUnits(serverWrapper)` finds `serverCounter = inner`. `inner.update()` (no clear) — render fn runs: `state.count = 0`, fresh `view` reconciled into `inner` (which had no children). `inner[State].count === 0`. ✓

**Invariants:**
- `start()` (M1 path) is unchanged — it still clears before update.
- `startHydrate` is private to `hydrate.ts`; it is not exported.
- Recursion terminates because `scanUnits` stops at FC boundaries: each recursive
  `startHydrate(el)` only scans the FC's own subtree, and each FC's subtree is
  finite and acyclic.
