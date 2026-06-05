/**
 * Hydration runtime — M1 contract stub (no-knobs design).
 *
 * The author surface for the hydration design
 * (`docs/developer/2026-06-04-B-hydration/design.md`) is two functions and
 * nothing else: no `register`, no `markHydrate`, no `Hydrator`, no string id,
 * and no `data-hydrate-on` trigger. Hydratability is an automatic side effect of
 * attaching behavior — FC components register themselves through
 * `customElements.define`, so the `customElements` registry IS the hydrator
 * registry.
 *
 * These signatures are the shape the M1 feature test (`hydrate.test.ts`) is
 * written against. The bodies are deliberately unimplemented: M1 (`start` + FC
 * adopt-and-hydrate on `load`, plus the `update()` `data-hydrate` marking in
 * `dom.ts`) is filled in by its own planning → red-green-refactor loop, which
 * removes the `{ todo: true }` markers from the feature test.
 *
 * The stub exists now only because this project's Stop gate runs `tsc --noEmit`,
 * which requires the feature test's import to resolve. No hydration behavior
 * lives here yet.
 */

/**
 * Walk `root` depth-first, returning every element whose localName is a
 * defined custom element. Does NOT descend into matched elements — each FC
 * owns its own subtree hydration; inner FCs are units in their own right and
 * will be reached by their parent's `el.update()`, not by `start()`.
 */
function scanUnits(root: ParentNode): Element[] {
  const results: Element[] = [];
  const stack: Element[] = Array.from(root.children);
  while (stack.length > 0) {
    const el = stack.pop() as Element;
    if (customElements.get(el.localName)) {
      results.push(el);
    } else {
      for (const child of Array.from(el.children)) {
        stack.push(child);
      }
    }
  }
  return results;
}

/**
 * Scan `root` for hydration units — defined custom elements (FCs) — and hydrate
 * each on the `load` policy: immediately after the scan. For each FC: await
 * `customElements.whenDefined`, adopt the upgraded server element as the live
 * `el`, and run `el.update()` so the render fn re-executes, `State` populates,
 * and the FC rebuilds its subtree. The scan never descends into a custom
 * element; each FC hydrates its own subtree. `root` defaults to
 * `window.document.body`. (M1)
 */
export function start(root?: ParentNode): void {
  const r = root ?? window.document.body;
  for (const el of scanUnits(r)) {
    customElements.whenDefined(el.localName).then(() => {
      // Clear server-rendered children so reconcileChildren inserts fresh nodes
      // from the render fn rather than reusing them via positional same-tag
      // matching. This ensures the render fn's captured child references point
      // at the nodes actually attached after hydration (design.md Metrics #4).
      el.replaceChildren();
      (el as { update(): void }).update();
    });
  }
}

/**
 * Whole-app page: re-run `render`, reconcile ONCE into `mount` (flash-free),
 * grafting handlers onto kept server nodes via the existing reconcile/patch
 * path. The reconcile stops at custom-element boundaries; each FC hydrates
 * itself. (M2)
 */
export function hydrateRoot(
  _mount: Element,
  _render: () => Node | Node[],
): void {
  throw new Error("hydrate.hydrateRoot: not implemented (M2)");
}
