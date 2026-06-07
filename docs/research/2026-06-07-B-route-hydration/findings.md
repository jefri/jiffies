# Route Hydration — Research Findings

Research backing `docs/developer/2026-06-07-B-route-hydration/design.md`.

## Codebase: what exists today

### Rendering & hydration (real DOM + custom elements)

- `renderToString` ([src/dom/render.ts:10](../../../src/dom/render.ts#L10)) serializes a
  **real** DOM tree (`document.createElement`, `outerHTML`) to an HTML string. No
  vdom.
- Components are **custom elements**: `FC(name, render)`
  ([src/dom/fc.ts:32](../../../src/dom/fc.ts#L32)) calls
  `customElements.define(name, …)`. A component instance is reused across renders
  via `el.update(attrs, …children)`.
- Hydration already exists ([src/dom/hydrate.ts](../../../src/dom/hydrate.ts)):
  - `start(root?)` — island hydration: scan `root` for defined custom elements,
    read props from the `__hydration` JSON payload, `el.update(props)` in place.
  - `hydrateRoot(mount, render)` — whole-app reconcile, then island pass.
  - An inline **capture stub** queues early user events
    (`window.__hydrateQueue`) before JS loads, then replays them after each FC
    hydrates.
- Reconcile is **keyless positional** patching: `reconcileChildren` /
  `patchNode` ([src/dom/dom.ts:219](../../../src/dom/dom.ts#L219)) morph an
  existing DOM subtree to match a fresh render, reusing same-tag nodes by
  position. Custom elements are a recursion boundary (they own their subtree).

### SSG pipeline (fully implemented)

- `build()` ([src/ssg/ssg.ts:83](../../../src/ssg/ssg.ts#L83)) assembles a full
  document: `<!doctype html><html${attrs}><head>${head}</head><body>${body}</body></html>`
  ([src/ssg/ssg.ts:126](../../../src/ssg/ssg.ts#L126)).
- `clientModules: string[]` → one deferred module script with verbatim
  `import "<spec>";` lines ([src/ssg/ssg.ts:112-120](../../../src/ssg/ssg.ts#L112-L120)).
- CLI ([src/ssg/main.ts](../../../src/ssg/main.ts)) is complete: page discovery
  (`pages/` + `page.ts` sentinel, `(group)`, `[dynamic]` + `generateStaticParams`),
  Rollup bundling of client modules to hashed `/assets/<name>-<hash>.js`
  ([src/ssg/bundle.ts](../../../src/ssg/bundle.ts)), specifier rewrite in the HTML
  ([src/ssg/rewrite.ts](../../../src/ssg/rewrite.ts)), `public/` copy, size table.
- Each page is an **independent standalone document**. Navigating between pages
  today is a full document load.

### Existing router (incompatible with SSG)

- `src/dom/router/router.ts` is an **old SPA router**: it maps a known `Link[]`
  to in-memory `target()` render functions and swaps a single element; it uses
  `history.pushState` + `popstate` + click interception
  ([src/dom/router/link.ts](../../../src/dom/router/link.ts)).
- It is **not integrated with the SSG build** and cannot fetch a pre-built page's
  HTML — it requires every route's render function to be present in the client
  bundle, which contradicts per-page build-time data loading.

### Motivating consumer

- `/Users/david.souther/devel/davidsouther/resume` builds fully static pages
  (no `clientModules`, no hydration today).
- `src/lib/page-head.ts` returns `<head>` nodes that include, inline:
  - a **theme picker**: `document.documentElement.dataset.theme = themes[Date.now() % 4]`
    — re-runs and flips color on every full document load.
  - **GA4**: `gtag.js` loader + `gtag('config', …)` — re-bootstraps on every load.

## External primitives (June 2026)

### Navigation API — Baseline Newly Available (Jan 2026)

- Supported: Chrome/Edge, Firefox 147, Safari 26.2.
- `navigation.addEventListener("navigate", e => { if (ok) e.intercept({ handler }) })`
  turns a navigation into a **same-document** navigation — replaces manual click +
  `popstate` interception, and handles back/forward, scroll restoration, and the
  in-flight/abort state machine.
- Caveat: Safari lacks `precommitHandler` (the "fetch before URL changes while old
  content stays visible" split). Basic `intercept()` works everywhere.
- Source: https://web.dev/blog/baseline-navigation-api ,
  https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/intercept

### View Transitions (same-document) — progressive enhancement

- `document.startViewTransition(() => updateDOM())`; Chrome 111+, Safari 18+,
  Firefox 133+. If `startViewTransition` is undefined, just update the DOM.
- With the Navigation API, check `e.hasUAVisualTransition` to avoid double
  transitions. Fetch content **before** calling `startViewTransition`.
- Sources: https://developer.chrome.com/docs/web-platform/view-transitions/same-document ,
  https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API

### Turbo Drive — the body-swap + head-merge reference model

- On navigation: replace `<body>` with the response's `<body>`; **merge** the
  `<head>` (assets/scripts already present are left untouched, so the browser does
  not re-process them); update `<html lang>`.
- New `<head>` `<script>`s not present on the current page are appended and run;
  identical ones are not. `data-turbo-track="reload"` + versioned asset URLs force
  a full reload when tracked assets change (the bundle-version escape hatch).
- `data-turbo-permanent` + `id` marks elements that persist across navigations.
- Source: https://turbo.hotwired.dev/handbook/drive ,
  https://turbo.hotwired.dev/reference/attributes

### GA4 in SPAs

- `gtag('config', ID, { send_page_view: false })` then manual
  `gtag('event', 'page_view', { page_location, page_title })` per navigation.
- Enhanced Measurement can auto-fire `page_view` on history changes (risk of
  double counting); disable it if sending manually.
- Source: https://developers.google.com/analytics/devguides/collection/ga4/views

## Implications for the design

1. **Same-document navigation is required**, not cross-document. A full document
   load (even with cross-document View Transitions) wipes JS state and re-runs
   `<head>` scripts — exactly the theme-flip / GA-rebootstrap the user wants gone.
   Keeping one document alive is what makes "run once" fall out naturally.
2. The router must, on navigate: fetch target HTML → parse → reconcile `<head>`
   (swap per-page title/meta, skip already-present one-time scripts) → swap
   `<body>` → **dynamically import the new page's client modules** (ES module cache
   dedupes shared chunks) → run hydration (`start()`/`hydrateRoot`) → swap the
   `__hydration` payload → optional View Transition → update history (handled by
   the Navigation API) → emit a GA `page_view`.
3. Inline `<head>` scripts inserted via `innerHTML` do **not** execute; the router
   must intentionally decide which head nodes to (re)activate. This is why head
   handling needs an explicit policy, not a blind innerHTML swap.
4. The existing `src/dom/router` cannot be reused as-is; the new mechanism is a
   fetch-pre-built-HTML router.
