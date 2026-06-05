# Node Modernization Tasks

- Hydration — M1 (FC adopt-and-hydrate + `load` trigger + auto-marking).
  `docs/developer/2026-06-04-B-hydration/`. **Design was revised to a no-knobs
  model** (auto-register on attached behavior; FC registration IS the
  `customElements` registry; no `register`/`markHydrate`/`Hydrator`/string-id/
  `data-hydrate-on`) and **re-drafted** — `design.md` now carries `*DRAFT*` again.
  Next: clear the design draft, then re-run the M1 feature-test loop. The new M1
  is FC adopt-and-hydrate (not the deleted id-registered `attach` tier). The
  existing `feature-test.md`, `plan.md`, `src/dom/hydrate.ts` stub, and
  `src/dom/hydrate.test.ts` are STALE — they encode the removed design and must be
  regenerated (see that folder's `TODO.md` "Stale artifacts"). M2–M5 follow per
  that folder's `TODO.md`. Follows up offline rendering (design A, commit
  `516a87f`).

- Hydration M1 — final refactor + review. Once `src/dom/hydrate.test.ts` is green
  (M1 implemented in `src/dom/hydrate.ts`), run `developer:refactor` then
  `general:review` over the M1 hydration surface before moving to M2.

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


