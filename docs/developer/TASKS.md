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

- SSG typed params ergonomics — `DynamicPageModule<P>` generic that ties
  `generateStaticParams` return type to `default`/`head` params. Deferred from
  dynamic-routes (design D); useful for large projects, pure DX improvement.

- Continue route hydration topic — `docs/developer/2026-06-07-B-route-hydration/`.
  **M1 runtime core landed and reviewed:** `src/dom/navigation/index.ts` —
  `navigate(url)` does fetch → head-reconcile (preserve `data-shell` by identity,
  swap per-page metadata + `__hydration`) → body-swap → inline-module import →
  `start()`, plus the `onNavigate` hook — passing its feature test
  (`src/dom/navigation/navigation.test.ts`) end-to-end. **Remaining M1:** the
  Navigation API interceptor; auto-bootstrap on import (`start()` of the initial
  page + the `onFirstLoad` hook); the non-2xx/network-error full-load fallback
  (currently a TODO in `fetchDocument`); inner-loop unit tests for the core's edge
  cases. **Then** M2 (click/`popstate` fallback sharing the core + View Transitions),
  M3 (build integration: `discoverShell`/`pages/shell.ts`, auto-inject the runtime,
  `data-shell` tagging, remove old `src/dom/router`), M4 (consumer migration of
  `page-head.ts` → `shell.head` + `shell.clientModule` + metadata-only `pageHead()`).
  Build sequence + deferred decisions in `design.md` (§ "Build sequence"). Run
  `developer:ailly` to resume; design + feature-test + plan gates are all cleared, so
  the next milestone starts a fresh design/feature-test/plan cycle for its scope.
  Research: `docs/research/2026-06-07-B-route-hydration/`.

- Final refactor + review for route hydration — the M1 runtime core was already
  refactored (`developer:refactor`, no smells) and reviewed (`general:review`, no
  blockers) this session. Run the topic-closing pass once the remaining
  milestones land: `developer:refactor` then `general:review` over the
  interceptor + fallback, build integration, and consumer migration before
  calling the topic done with `developer:cleanup`.

- Continue form controls topic — `docs/developer/2026-06-06-C-form-typing/`.
  Design refined to cover a **demo page** (`form.app.ts` as a `PageModule`
  showcasing every control), a **feature test** (`form.feature.test.ts`)
  asserting the rendered accessible DOM (first coverage for
  `Select`/`Dropdown`/`Option`), then the **typing fix** (widen `DomAttrs.role`
  to `string`, drop the `@ts-expect-error`/casts, simplify `Dropdown`). Design is
  `*DRAFT*` again pending re-review; clear the marker, then run `developer:ailly`
  to resume at the feature-test step.

- Access-log status + response-time capture. `prettyLogFormatter` (in
  `src/log.ts`, landed on `main`) renders an access line `GET /trips/hvar
  127.0.0.1` and already prints a colored `status` and `<n>ms` segment **if those
  fields are present** — but `src/server/http/index.ts` `log(req)` does not
  capture them. Hook `res.on("finish")` to record `res.statusCode` and elapsed
  time, then add `status`/`ms` to the `info("Request", …)` payload. Follow-up from
  the log-formatter work (its out-of-scope list).

- Demote per-page "Adding to sitemap" from `info` to `debug`
  (`src/server/http/sitemap.ts`). It fires once per page (×20), drowning the
  genuinely useful `Server listening …:8080` line; demoting keeps the default
  `info` stream signal-dense. Follow-up from the log-formatter work. Emit-site
  change, not a formatter change.

- ASCII glyph fallback for the pretty logger. `prettyLogFormatter` uses the
  unicode glyphs `ℹ ⚠ ✖ ·`; add an ASCII-safe fallback for non-UTF terminals if
  one ever surfaces. Deferred from the log-formatter work.
