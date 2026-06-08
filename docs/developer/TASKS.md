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
  **M1 landed and green** in `src/dom/navigation/index.ts`: the runtime core
  (`navigate(url)` does fetch → head-reconcile, preserving `data-shell` by identity,
  swap per-page metadata + `__hydration` → body-swap → inline-module import →
  `start()`, plus `onNavigate`), AND remaining-M1 — `bootstrap()` (import-side-effect-
  free entry: hydrate the initial page, install the interceptor, fire `onFirstLoad`
  with a retained first-load context), the **Navigation-API-only** interceptor
  (`installInterceptor` registers one `navigate` listener: decline on
  `!canIntercept`/`hashChange`/`downloadRequest`/`formData`, else `intercept` →
  `navigate`; a no-op where the API is absent — evergreen-only, no click/`popstate`
  shim), and the non-2xx/network-error `fullLoad` fallback. Feature test
  `src/dom/navigation/interceptor.test.ts` (Navigation API stubbed under jsdom) +
  unit tests `interceptor.unit.test.ts` (onFirstLoad-after, decline matrix,
  fetch-failure) green; M1-core test still `navigation.test.ts`. Added
  `@types/dom-navigation` dev dep (see its own TASKS entry). **Next: M2** — View
  Transitions for the same-document body swap (`document.startViewTransition` when
  present and `event.hasUAVisualTransition` is false; `NavigationContext.type` could
  also start reflecting the event's `navigationType` instead of always `"push"`).
  **Then** M3 (build integration: `discoverShell`/`pages/shell.ts`, auto-inject the
  runtime, `data-shell` tagging, remove old `src/dom/router`), M4 (consumer migration
  of `page-head.ts` → `shell.head` + `shell.clientModule` + metadata-only `pageHead()`).
  Build sequence + deferred decisions in `design.md` (§ "Build sequence"). Run
  `developer:ailly` to resume; M2 starts a fresh design/feature-test/plan cycle for
  its scope. Research: `docs/research/2026-06-07-B-route-hydration/`.

- Final refactor + review for route hydration — the M1 runtime core was already
  refactored (`developer:refactor`, no smells) and reviewed (`general:review`, no
  blockers) this session. Run the topic-closing pass once the remaining
  milestones land: `developer:refactor` then `general:review` over the
  interceptor + fallback, build integration, and consumer migration before
  calling the topic done with `developer:cleanup`.

- Drop the `@types/dom-navigation` dev dependency — added for `window.navigation` /
  `NavigateEvent` typing in `src/dom/navigation/index.ts` (the route-hydration
  interceptor), because TypeScript 5.9's bundled `lib.dom.d.ts` has no Navigation API
  types. TypeScript folds them into `lib.dom.d.ts` as of **TS 6.0**
  (per the package header; tracking issue microsoft/TypeScript-DOM-lib-generator#1531).
  When this project upgrades to TS 6.0+, remove the dependency and confirm `tsc` is
  still clean.

- Continue form controls topic — `docs/developer/2026-06-06-C-form-typing/`.
  Design refined to cover a **demo page** (`form.app.ts` as a `PageModule`
  showcasing every control), a **feature test** (`form.feature.test.ts`)
  asserting the rendered accessible DOM (first coverage for
  `Select`/`Dropdown`/`Option`), then the **typing fix** (widen `DomAttrs.role`
  to `string`, drop the `@ts-expect-error`/casts, simplify `Dropdown`). Design is
  `*DRAFT*` again pending re-review; clear the marker, then run `developer:ailly`
  to resume at the feature-test step.
