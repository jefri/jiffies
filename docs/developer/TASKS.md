# Node Modernization Tasks

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

- Continue form controls topic — `docs/developer/2026-06-06-C-form-typing/`.
  Design refined to cover a **demo page** (`form.app.ts` as a `PageModule`
  showcasing every control), a **feature test** (`form.feature.test.ts`)
  asserting the rendered accessible DOM (first coverage for
  `Select`/`Dropdown`/`Option`), then the **typing fix** (widen `DomAttrs.role`
  to `string`, drop the `@ts-expect-error`/casts, simplify `Dropdown`). Design is
  `*DRAFT*` again pending re-review; clear the marker, then run `developer:ailly`
  to resume at the feature-test step.
