# Route Hydration for SSG

## Problem Statement

The SSG build ([src/ssg/main.ts](../../../src/ssg/main.ts),
[src/ssg/ssg.ts](../../../src/ssg/ssg.ts)) emits each route as an independent,
standalone HTML document. Navigating between two built pages is therefore a full
document load: the browser discards all JavaScript state and re-executes every
`<head>` and `<body>` script of the destination page.

This breaks any effect that is meant to run **once per session** rather than once
per page. The motivating consumer is
`/Users/david.souther/devel/davidsouther/resume/src/lib/page-head.ts`, whose
`pageHead()` returns `<head>` nodes that include, inline:

- a **theme picker** — `document.documentElement.dataset.theme = themes[Date.now() % 4]`
  — which selects a different theme on every load, so the site visibly changes
  color on every navigation; and
- **Google Analytics 4** — the `gtag.js` loader plus `gtag('config', …)` — which
  re-downloads and re-bootstraps the analytics library on every navigation
  instead of reporting an in-session pageview.

This component adds **route hydration**: after a built page loads and hydrates,
client-side routing intercepts in-app navigation and turns it into a
**same-document** transition. The destination page's body is fetched and swapped
in without a full reload, so JavaScript state survives. One-time effects (theme,
analytics bootstrap) run once on first load and persist; per-page metadata
(`<title>`, `<meta>`) updates on each navigation; analytics reports each
navigation as a virtual pageview. Every page remains a complete standalone
document, so direct loads, no-JS clients, crawlers, and unsupported browsers are
unaffected.

## Prior Art

- **Existing hydration** ([src/dom/hydrate.ts](../../../src/dom/hydrate.ts)) —
  `start(root?)` scans for defined custom elements, reads props from the
  `__hydration` JSON payload, and adopts each element in place via `el.update()`.
  An inline capture stub queues early user events
  (`window.__hydrateQueue`) and replays them after each FC hydrates. Route
  hydration reuses `start()` unchanged after each body swap.
- **Keyless reconcile** ([src/dom/dom.ts:219](../../../src/dom/dom.ts#L219)) —
  `reconcileChildren` / `patchNode` morph an existing DOM subtree to match a fresh
  render, reusing same-tag nodes by position. The head reconciler in this design
  is a small, head-specific analogue (it diffs a flat list of head nodes rather
  than a recursive tree).
- **SSG document assembly**
  ([src/ssg/ssg.ts:83-134](../../../src/ssg/ssg.ts#L83-L134)) — the existing
  full-document emitter (`<!doctype html><html><head>…</head><body>…</body>`),
  the `__hydration` payload script
  ([src/ssg/ssg.ts:98](../../../src/ssg/ssg.ts#L98)), and the deferred
  `clientModules` script
  ([src/ssg/ssg.ts:117-120](../../../src/ssg/ssg.ts#L117-L120)). Route hydration
  adds an auto-injected runtime entry and a `data-shell` head marker; the rest is
  unchanged.
- **Rollup client bundling** ([src/ssg/bundle.ts](../../../src/ssg/bundle.ts)) —
  bundles `clientModules` to hashed `/assets/<name>-<hash>.js`. The navigation
  runtime is bundled as one more client entry; shared chunks hoist, so the
  runtime and shared code are downloaded once and re-used across navigations via
  the browser's ES module cache.
- **Existing client router** ([src/dom/router/router.ts](../../../src/dom/router/router.ts))
  — an in-memory SPA router that maps a known `Link[]` to render functions. It
  cannot fetch a pre-built page and requires every route's render function in the
  client bundle, which is incompatible with per-page build-time data loading. It
  is removed by this design (see Specification §7). Zero importers exist.
- **Navigation API** — Baseline Newly Available (Jan 2026): Chrome/Edge, Firefox
  147, Safari 26.2. `navigation.addEventListener("navigate", e => e.intercept({…}))`
  turns a navigation into a same-document navigation and owns history, scroll
  restoration, and the in-flight/abort state machine. Safari lacks the
  `precommitHandler` split, but basic `intercept()` is universal.
  https://web.dev/blog/baseline-navigation-api
- **View Transitions (same-document)** — `document.startViewTransition(cb)`;
  Chrome 111+, Safari 18+, Firefox 133+. Progressive enhancement: if undefined,
  apply the DOM update directly.
  https://developer.chrome.com/docs/web-platform/view-transitions/same-document
- **Turbo Drive** — the body-swap + head-merge reference model: replace `<body>`,
  merge `<head>` (assets already present are left untouched and not re-processed),
  update `<html lang>`; `data-turbo-permanent` persists elements across
  navigations. This design's `data-shell` marker plays the role of Turbo's
  head-merge identity check, made explicit.
  https://turbo.hotwired.dev/handbook/drive
- **GA4 in SPAs** — `gtag('config', ID, { send_page_view: false })` then manual
  `gtag('event', 'page_view', { page_location, page_title })` per navigation;
  disable Enhanced Measurement's history-based pageviews to avoid double counting.
  https://developers.google.com/analytics/devguides/collection/ga4/views

Fuller research notes:
`docs/research/2026-06-07-B-route-hydration/findings.md`.

## Metrics

Route hydration operates acceptably when:

- **Run-once correctness.** Across a multi-page session navigated entirely via
  in-app links: `gtag.js` is fetched exactly once; `document.documentElement.dataset.theme`
  is identical before and after every navigation (no flip); exactly one analytics
  `page_view` is reported per navigation (no duplicates, no misses).
- **Navigation correctness.** After an in-app navigation, `document.title` and the
  rendered `<body>` match a full document load of the same route; interactive
  islands on the destination page are hydrated and respond to input; browser
  back/forward restores the prior page and its scroll position.
- **Resilience / graceful degradation.** A fetch failure, a non-interceptable
  navigation, a no-JS client, or a browser without the Navigation API results in a
  normal full document load with no broken intermediate state. Every route remains
  a complete standalone document.
- **Performance.** An in-app navigation re-uses cached shared chunks (the runtime
  and shared bundle are not re-downloaded); only the destination page's HTML and
  any not-yet-loaded per-page module chunk are fetched.

## Specification

### Overview

```text
First load (built page in the browser):
  page HTML parsed → shell head applied (pre-paint) → runtime auto-injected script runs
  → runtime: start() hydrates initial page → install navigate listener → fire onFirstLoad
  → shell modules' top-level effects run once (theme already applied; GA bootstraps)

In-app navigation (link click / back / forward):
  Navigation API navigate event → intercept
  → fetch(destination URL) the built HTML → parse to a Document
  → reconcile <head> (preserve data-shell, replace per-page nodes incl. __hydration)
  → [optional document.startViewTransition]
       swap <body>
  → import() the destination page's module specifiers (ES cache dedupes)
  → start() hydrates the destination page
  → fire onNavigate(cb) hooks (e.g. GA page_view)
```

### 1. Navigation runtime (`src/dom/navigation/`)

A new module, bundled as a client entry. Importing it bootstraps route hydration
as a side effect; it also exports lifecycle hooks for shell code.

```ts
export interface NavigationContext {
  /** Destination URL of the navigation. */
  url: URL;
  /** document.title after the head reconcile for this navigation. */
  title: string;
  /** "first" on initial load, "push" | "traverse" | "replace" thereafter. */
  type: "first" | "push" | "traverse" | "replace";
}

/** Run cb once, after the initial page hydrates on first document load. */
export function onFirstLoad(cb: (ctx: NavigationContext) => void): void;

/** Run cb after every in-app navigation completes (body swapped + hydrated). */
export function onNavigate(cb: (ctx: NavigationContext) => void): void;
```

On import the runtime:

1. Calls `start()` to hydrate the initial document.
2. Installs the navigation interceptor (§2) — the Navigation API path when
   `"navigation" in window`, otherwise the click + `popstate` fallback (§8).
3. Fires `onFirstLoad` callbacks with `type: "first"`.

The runtime retains the latest `NavigationContext`. Hooks registered after first
load (a possibility if a shell module imports the runtime lazily) still receive
subsequent `onNavigate` events; `onFirstLoad` callbacks registered after first load
are invoked immediately with the retained context, so registration order does not
drop the initial event.

### 2. Navigation lifecycle

The interceptor handles a navigation only when it is a same-origin, same-document
candidate. It declines (lets the browser perform a full load) when the navigation
is cross-origin, a download, a non-GET form submission, hash-only within the
current document, opened with a modifier key / non-primary button, or when
`event.canIntercept` is false. Form submissions are out of scope (deferred; see
Summary).

For an intercepted navigation the handler:

1. `fetch(url)` the destination's built HTML. A non-2xx response or a network
   error aborts the same-document path and falls back to `location.assign(url)`.
2. Parse the response text with `DOMParser` into a detached `Document`.
3. Reconcile `<head>` (§3) against the detached document's head.
4. If `document.startViewTransition` exists and `event.hasUAVisualTransition`
   is false, run the body swap inside `startViewTransition`; otherwise run it
   directly. The swap replaces the live `<body>` children with the detached
   body's children (imported via `document.importNode`).
5. Extract module URLs from the destination body by parsing the `import "<url>";`
   statements out of its `<script type="module">` text — the build emits inline
   `import` statements, not `src` attributes, so this mirrors the exact format
   [src/ssg/rewrite.ts](../../../src/ssg/rewrite.ts) produces — and `import()` each,
   awaiting all. The ES module cache dedupes the runtime, shell modules, and shared
   chunks (re-importing them is a no-op), so only a not-yet-loaded per-page chunk is
   actually fetched.
6. Call `start()` to hydrate the swapped-in body.
7. Fire `onNavigate` callbacks with the navigation `type` and the new `title`.

Scroll restoration, history entries, and back/forward are owned by the Navigation
API. In the fallback path the runtime calls `history.pushState` on link clicks and
listens for `popstate` (§8).

### 3. Head reconciliation

The build tags every shell head node with `data-shell` (§5). The reconciler
treats the head as two groups:

- **Shell nodes** (`[data-shell]`) — preserved untouched. They are never removed,
  re-inserted, or re-executed. This is what guarantees the inline pre-paint theme
  script and the shared stylesheet links run/load once for the document's
  lifetime. (Inline scripts inserted via DOM never re-execute anyway; preserving
  the node in place avoids even the question.)
- **Per-page nodes** (everything else) — `<title>`, `<meta>` (description,
  canonical, Open Graph), and the per-page `__hydration` payload script. These are
  fully replaced with the destination document's non-shell head nodes. `<title>`
  is applied via `document.title` so it takes effect immediately.

Because the destination's `__hydration` payload is a per-page node, it is swapped
in before `start()` runs, so the destination page's islands hydrate with the
correct props. `<html lang>` is updated from the destination document when it
differs.

The reconciler matches per-page nodes structurally (tag plus key attributes —
`name`/`property`/`rel` for `<meta>`/`<link>`) so unchanged nodes are not churned,
but correctness does not depend on the match being minimal: the contract is that
the live head's non-shell nodes, taken as a set keyed structurally, equal the
destination's. Ordering among per-page metadata nodes is not significant.

### 4. Hydration contract

The runtime **owns** hydration. After each body swap it calls `start()`; on first
load it calls `start()` once. Consequently:

- **Client modules register components only.** A page's `clientModules` import
  their FC definitions (the `customElements.define` side effect) and must **not**
  call `start()` themselves. Two reasons: (a) module bodies run once per URL under
  the ES cache, so a top-level `start()` would not re-fire when navigating back to
  a previously imported page; (b) a second `start()` over an already-hydrated
  island re-runs `el.update()` and would reset island state. Centralizing
  `start()` in the runtime makes hydration fire exactly once per page appearance.
- **`demo/hydration/client.ts` migrates** to drop its `start()` call (it becomes a
  pure `import "./components.ts"`). The demo is extended to multiple pages to
  exercise navigation (M3 in the Summary).

This contract applies whenever the navigation runtime is present (any multi-page
build). A single-page build with no runtime keeps today's behavior, where a client
module may call `start()` itself. Consequently, promoting a single-page build to
multi-page requires removing any `start()` calls from its client modules; the
`demo/hydration/client.ts` migration above is the worked example.

### 5. SSG build changes

The CLI is flags-only today ([src/ssg/main.ts](../../../src/ssg/main.ts)):
`runBuild` discovers pages, calls `build({ pages, out, fs })`, bundles the union of
page `clientModules` ([src/ssg/bundle.ts](../../../src/ssg/bundle.ts)), then
rewrites each page's HTML import specifiers to hashed URLs
([src/ssg/rewrite.ts](../../../src/ssg/rewrite.ts)). There is **no
`ssg.config.ts` / `SsgConfig` layer** — the executable-config design in
`docs/developer/2026-06-06-A-ssg-cli/design.md` was never implemented. Route
hydration therefore attaches its surfaces to the mechanisms that exist:
filesystem discovery and `build()`.

**App-level shell — a discovered `shell.ts`.** Mirroring the `page.ts` sentinel,
the build looks for `<pages>/shell.ts` via a new `discoverShell(rootDir, pages)`
beside `discoverPages`. It is app-wide (one shell per site; per-segment shells are
out of scope). The module shape:

```ts
export interface ShellModule {
  /** Build-time <head> nodes emitted into every page, tagged data-shell, run
   *  once for the document's lifetime. Returns Element nodes only — each carries
   *  the data-shell attribute. Pre-paint safe: the inline theme script lives here. */
  head?: () => Element | Element[] | Promise<Element | Element[]>;
  /** Run-once client module specifiers (e.g. analytics bootstrap). */
  clientModules?: string[];
}
```

**Multi-page detection and runtime injection.** `runBuild` injects the navigation
runtime when `pages.length > 1`; a single-page build injects nothing and is
byte-for-byte unchanged. The runtime ships inside jiffies, so its disk path is
resolved relative to the build's own module location
(`new URL("../dom/navigation/index.ts", import.meta.url)`), never against the
consumer's `rootDir` — consumer specifiers resolve via `join(rootDir, spec)`, and
an internal package path would not. `bundleClientModules` gains an
`extraEntries: { specifier: string; path: string }[]` parameter carrying absolute
disk paths for the runtime and any `shell.clientModules`. These become Rollup
inputs alongside page modules and hoist into shared chunks, so the runtime is
downloaded once; the returned `specToUrl` map is keyed by each entry's `specifier`
(a reserved token for the runtime, the consumer's original string for shell
modules), so the HTML rewrite stays uniform.

**Emission and rewrite.** `build()` gains `shell?: ShellModule` in `BuildOptions`.
Per page it (a) renders `shell.head()` into `<head>`, tagging each returned Element
with `data-shell`; and (b) when injection is active, prepends the reserved runtime
import and the `shell.clientModules` imports to that page's deferred module script,
ahead of the page's own `clientModules`. Because every page in a multi-page build
now carries at least the runtime import, the rewrite step
([src/ssg/main.ts:77-88](../../../src/ssg/main.ts#L77-L88)) runs for every page —
not only pages that declared `clientModules` — mapping runtime, shell, and page
specifiers to their hashed `/assets/*.js` URLs.

**Per-page `head()` becomes pure per-page metadata** (`<title>`, `<meta>`,
canonical, Open Graph). Per-page `clientModules` keep their contract but are now
also re-imported on navigation to a page (§4).

A multi-page build with no `shell.ts` still gets SPA navigation (runtime injected,
per-page `head()`s swapped); there are simply no consumer-defined once-effects.

### 6. Consumer migration (resume `page-head.ts`)

The motivating consumer adds a `pages/shell.ts` and restructures as follows:

- **Theme picker** → `shell.head`. It stays an inline pre-paint script (no FOUC)
  and, being `data-shell`, is preserved across navigations so the theme never
  flips within a session. Recommended independent fix: persist the chosen theme
  (e.g. `localStorage`) and read it back, so the `Date.now() % 4` pick is also
  stable across full document loads, not only within an SPA session. This is a
  correctness fix for the picker itself, orthogonal to routing.
- **Google Analytics** → a `shell.clientModule`. It loads `gtag.js` with
  `gtag('config', ID, { send_page_view: false })` (and Enhanced Measurement's
  history-based pageviews disabled in the GA property) and registers
  `onNavigate(({ url, title }) => gtag('event', 'page_view', { page_location:
  url.href, page_title: title }))`. GA bootstraps once; each navigation reports one
  virtual pageview.
- **`pageHead(title)`** → returns only per-page metadata (`<title>`, `<meta>`),
  with the shared stylesheet links and charset/viewport moved to `shell.head`.

The resume gains its first `clientModules` usage and becomes a multi-page hydrated
site; the build auto-injects the runtime because it emits more than one page.

### 7. Old router removal

[src/dom/router/router.ts](../../../src/dom/router/router.ts) and
[src/dom/router/link.ts](../../../src/dom/router/link.ts) are deleted. A repo-wide
search finds zero importers outside the directory, no test references, and no
`package.json` exports entry, so removal is mechanical. Per the migration decision,
consumers that still depend on the old in-memory router pin a prior published
version until they migrate to route hydration.

### 8. Browser support floor and fallback

The Navigation API is the primary intercept mechanism. When `"navigation" in
window` is false, the runtime installs a fallback: a delegated `click` listener on
the document that intercepts same-origin primary-button link clicks (calling
`history.pushState` and running the same fetch/reconcile/swap/import/hydrate core),
plus a `popstate` listener that re-runs the core for back/forward. The same-document
core (§2 steps 1-7) is shared between both paths; only event acquisition and history
bookkeeping differ.

A follow-up task will be recorded in `docs/developer/TASKS.md` (at M3) to drop the
fallback once the Navigation API is sufficiently baseline for this project's
audience.

### Failure modes

| Condition | Behavior |
|---|---|
| Navigation API unavailable | Click + `popstate` fallback drives the same core (§8). |
| Both unavailable (no JS) | Normal full document loads; every page is standalone. |
| `fetch` non-2xx or network error | Fall back to `location.assign(url)` (full load). |
| Destination HTML unparseable / missing `<body>` | Fall back to full load. |
| Cross-origin / download / modifier-click / hash-only / non-GET | Not intercepted; browser handles natively. |
| A per-page module fails to `import()` | Body is shown un-hydrated for that island; error logged. The page is still navigable (links work). |
| `startViewTransition` unsupported or `hasUAVisualTransition` true | Body swap applied directly, no manual transition. |

### Verification

**Automated** (the repo runs DOM tests against a jsdom-style environment and uses
`RecordFileSystemAdapter` for build tests):

- *Head reconcile*: given a live head and a destination head, `data-shell` nodes
  are byte-identical and untouched; non-shell nodes equal the destination's;
  `document.title` updates; `__hydration` payload is the destination's.
- *Body swap + hydrate*: after swapping a destination body containing a custom
  element and `__hydration` payload, `start()` hydrates it and it responds to a
  dispatched event.
- *Module import*: navigating to a page whose components are not yet defined
  imports its module script and defines the element before hydration; navigating
  back does not re-run the module's top-level code.
- *Run-once*: across two simulated navigations, a shell module's top-level effect
  runs once; an `onNavigate` hook runs once per navigation.
- *Fallback path*: with the Navigation API stubbed absent, a link click is
  intercepted, history is pushed, and the core runs.
- *Build*: a >1-page build injects the runtime import into every page and tags
  `shell.head` nodes with `data-shell`; a 1-page build injects nothing.

**Manual**:

- Build a multi-page demo, serve `dist/` with a static server, and click between
  pages: confirm the theme does not change, `gtag.js` is requested exactly once
  (devtools Network), one `page_view` per navigation (GA debug / Network), titles
  update, and browser back/forward works. Disable JavaScript and confirm normal
  full-page navigation still works.

## Alternatives

**Content strategy — Build-time route manifest + prefetch (B).** Emit a
`route → module URLs` (optionally prerendered bodies) manifest the runtime consumes,
enabling link prefetch and instant navigation. Rejected as the foundation: it
couples the build to the runtime and introduces a second source of truth that
duplicates information already present in each page's self-describing HTML.
Prefetch is a clean *enhancement on top of* the recommended approach (prefetch the
destination HTML on link hover/viewport) and is deferred.

**Content strategy — Single-bundle in-memory SPA (C).** Bundle every page's render
function into one client app and re-render routes in memory with no fetch (the old
`src/dom/router` model). Rejected: pages load data at build time (`async default()`,
TOML/markdown loaders) and bake it into HTML; the client cannot re-run build-time
data loads, so it cannot render routes in memory. This is the same incompatibility
that makes the old router unusable here.

**Transition mechanism — Cross-document View Transitions only.** Use
`@view-transition { navigation: auto }` for smooth MPA transitions and skip the
client router entirely. Rejected: cross-document navigation is still a full document
load that wipes JS state and re-runs `<head>` scripts — it does not deliver the
run-once requirement (theme stays fixed, GA loads once) that is the point of this
component. Same-document navigation is required; cross-document VT is a different
feature.

**Run-once model — Head-merge by identity (no `data-shell`).** Preserve head nodes
that are byte-identical between the current and destination heads (Turbo's exact
mechanism) instead of an explicit marker. Rejected in favor of the marker: identity
matching is implicit and brittle (two pages that coincidentally render a shell node
differently would re-run it), whereas `data-shell` states intent at the build
boundary and is deterministic. The marker is emitted by the build, so consumers do
not hand-author it.

**Manual click/`popstate` only (no Navigation API).** Skip the Navigation API and
always use click interception. Rejected as the primary path: the Navigation API
correctly handles programmatic navigation, back/forward, scroll restoration, and
the abort/in-flight state machine that manual interception gets wrong in edge
cases. The manual path is retained only as the fallback (§8).

## Summary

Route hydration turns the SSG's standalone pages into a same-document
navigation experience without abandoning the standalone-document guarantee. A new
auto-injected runtime ([src/dom/navigation/](../../../src/dom/navigation/))
intercepts in-app navigations via the Navigation API (with a click/`popstate`
fallback), fetches the destination's already-built HTML, reconciles the `<head>`
(preserving `data-shell` nodes, replacing per-page metadata and the `__hydration`
payload), swaps the `<body>` (optionally inside a View Transition), re-imports the
destination page's module scripts, and re-runs the existing `start()` hydration.
One-time effects move from per-page `<head>` into an app-level `shell` (`shell.head`
for pre-paint nodes like the theme script, `shell.clientModules` for analytics),
so they run once and persist; per-page `head()` becomes pure metadata; analytics
reports each navigation as a virtual pageview through an `onNavigate` hook. The
incompatible in-memory router is removed.

**Build sequence (basis for the plan phase):**

- **M1 — Runtime core.** `src/dom/navigation/` with the fetch → head-reconcile →
  body-swap → import → `start()` core, the Navigation API interceptor, and the
  `onFirstLoad`/`onNavigate` hooks. Unit-tested against a DOM environment with a
  fixture destination document.
- **M2 — Fallback + View Transitions.** Click/`popstate` fallback sharing the core;
  `startViewTransition` enhancement with the `hasUAVisualTransition` guard.
- **M3 — Build integration.** `discoverShell` for `pages/shell.ts`; auto-inject the
  runtime for >1-page builds (`shell.head` tagged `data-shell`, `shell.clientModules`
  and the runtime bundled via `extraEntries`); per-page `head()` documented as
  metadata-only; record the fallback-removal task in TASKS.md. Remove the old router.
  Multi-page demo + build tests.
- **M4 — Consumer migration.** Restructure the resume's `page-head.ts` into
  `shell.head` (theme) + `shell.clientModule` (GA with `send_page_view:false` +
  `onNavigate` pageview) + metadata-only `pageHead()`.

**Deferred technical decisions:**

- **Form submissions.** Out of scope; only link/history navigation is intercepted.
  Add later following Turbo's form handling if a consumer needs it.
- **Link prefetch (alternative B).** Prefetch destination HTML on hover/viewport as
  an enhancement once the core ships.
- **Dropping the fallback.** Recorded as a TASKS.md follow-up to remove the
  click/`popstate` path when the Navigation API is sufficiently baseline.
- **Persistent islands.** A `data-shell`-style marker for *body* elements that
  should survive a navigation un-rehydrated (Turbo's `data-turbo-permanent`). Not
  needed by the motivating use case; revisit if a persistent player/widget appears.
- **Theme persistence across sessions.** Recommended (`localStorage`) but a property
  of the consumer's picker, not of this component.
