# Node Modernization Tasks

- Hydration M3 — internal serialized JSON data-prop channel. A page-level
  `<script type="application/json" id="__hydration">` payload carries each FC
  unit's data props (keyed by derived document-order position) from server to
  client; `start()` reads it and passes props to `el.update(props)`. Payload
  values are escaped to close the `</script>` XSS class. Design detail:
  `docs/developer/2026-06-04-B-hydration/design.md` § "State channel (M3)"
  (git history, commit `09a988e`).

- Hydration M4 — event capture-and-replay across the hydration gap. A tiny
  inline stub installs capture-phase listeners on `document` at first paint;
  events targeting un-hydrated units are queued; after a unit hydrates, queued
  events are re-dispatched by resolving their `childNodes`-index path. Best-effort
  for FC units (subtree rebuilt). Design detail: § "Event capture-and-replay"
  in the same doc.

- Hydration M5 — offline-rendering / SSG integration. The design A build gains
  a hydration pass: collect unit props → state payload, emit `defer-hydration`
  on nested custom elements, inject the inline capture stub, and inject a
  deferred `type="module"` client entry that imports component modules (running
  their `customElements.define` calls) and calls `start()`. Design detail: §
  "Build / serving integration (M5)" in the same doc.

- SSG output cleanup — unwrap custom-element tags and trim reflected-attr noise
  (e.g. `items="wash,fold"`) as a post-processing pass over `renderToString`
  output. Deferred from offline-rendering (design A); do when a real use case
  exposes the noise as a problem.

- SSR middleware — on-the-fly `renderDocument` consumption path: a
  `MiddlewareFactory` that renders page modules per request instead of at build
  time. Deferred from offline-rendering (design A); natural follow-up after
  hydration stabilises.

- Keyed reconcile + `keyed` no-allocation helper. FC-render shipped the keyless
  automatic path (positional same-tag patch-reuse + recursive `patchNode` in
  `src/dom/dom.ts`) but deferred explicit keys: the exported `KEY` symbol with
  key/id resolution, the per-parent key cache, cross-position keyed matching to
  kill reorder churn (`insertBefore` fires connect/disconnect on moved custom
  elements), branchy renders (inline_edit view/edit), and adopting the automatic
  path in `inline_edit.ts` / `virtual_scroll.ts`. See
  TASK-NOTES-keyed-reconcile.md.


