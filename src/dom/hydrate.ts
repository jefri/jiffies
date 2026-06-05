/**
 * Hydration runtime — M1: FC adopt-and-hydrate on `load` (no-knobs design).
 *
 * Author surface: `start` (M1) and `hydrateRoot` (M2). No `register`,
 * `markHydrate`, string id, or trigger attribute. Hydratability is a side
 * effect of attaching behavior via `update()` in `dom.ts`; `customElements`
 * registration IS the hydrator registry.
 */

/**
 * Walk `root` depth-first, returning every element whose localName is a
 * defined custom element. Does NOT descend into matched elements — each FC
 * owns its own subtree hydration; inner FCs are units in their own right and
 * will be reached by their parent's `el.update()`, not by `start()`.
 */
function scanUnits(root: ParentNode): Element[] {
  const results: Element[] = [];
  const stack: Element[] = [...root.children];
  while (stack.length > 0) {
    const el = stack.pop() as Element;
    if (customElements.get(el.localName)) {
      results.push(el);
    } else {
      for (const child of el.children) {
        stack.push(child);
      }
    }
  }
  return results;
}

/**
 * Scan `root` for defined custom elements (FC units) and schedule each for
 * hydration: `customElements.whenDefined` for each unit resolves as a
 * microtask even when the element is already defined. The callback clears
 * server children then runs `el.update()` — the render fn re-executes,
 * `State` populates, and the FC rebuilds its subtree. `root` defaults to
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
      el.update();
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
