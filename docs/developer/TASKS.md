# Node Modernization Tasks

- Keyed reconcile + `keyed` no-allocation helper. FC-render shipped the keyless
  automatic path (positional same-tag patch-reuse + recursive `patchNode` in
  `src/dom/dom.ts`) but deferred explicit keys: the exported `KEY` symbol with
  key/id resolution, the per-parent key cache, cross-position keyed matching to
  kill reorder churn (`insertBefore` fires connect/disconnect on moved custom
  elements), branchy renders (inline_edit view/edit), and adopting the automatic
  path in `inline_edit.ts` / `virtual_scroll.ts`. See
  TASK-NOTES-keyed-reconcile.md.


