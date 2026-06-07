# Feature Test: Route Hydration — remaining M1 (auto-bootstrap + interceptor)

**Test file:** [`src/dom/navigation/interceptor.test.ts`](../../../src/dom/navigation/interceptor.test.ts)

**Design:** [`design.md`](./design.md) §1 (navigation runtime / bootstrap),
§2 (lifecycle), §8 (browser support floor and fallback).

This is the second feature-test cycle of the route-hydration topic. The first
(M1 same-document core — `navigate(url)`: fetch → head-reconcile → body-swap →
import → `start()` → `onNavigate`) is built and green; its artifacts are archived
as [`feature-test-m1-core.md`](./feature-test-m1-core.md) and
[`plan-m1-core.md`](./plan-m1-core.md), and its test is
[`navigation.test.ts`](../../../src/dom/navigation/navigation.test.ts).

## User Story

**Given** a built multi-page site has loaded its first page (page A) — server
markup, not yet hydrated — with an in-app link to page B,

**When** the runtime bootstraps and the visitor then clicks the in-app link,

**Then** bootstrap hydrates the initial page and reports the first load
(`onFirstLoad` fires once with `type: "first"`, the page-A URL and title), and the
link click is *intercepted* — the browser's full-page load is cancelled, a history
entry for the destination is pushed, and the shared same-document core swaps in
page B's head metadata and body, imports its module, hydrates its island, and
reports the navigation (`onNavigate` fires once with page B's URL and title) — all
without a document reload.

## Why this story

It is the headline user-facing behavior that "remaining M1" adds on top of the
proven core: the visitor clicks links and gets smooth same-document transitions
instead of full reloads, and shell hooks observe both the initial load and each
navigation. It exercises every remaining-M1 surface that is cleanly testable under
jsdom — the auto-bootstrap entry, the `onFirstLoad` hook, and the click
interceptor — funnelling them into the already-verified `navigate()` core.

## Test environment note

The **Navigation API is the sole interception mechanism** (design §2/§8): the
runtime registers one `navigate` listener and claims a navigation via
`event.intercept`. jsdom ships neither the Navigation API nor a real origin, so the
suite supplies both. It boots its own real-URL window (`https://example.test/a`) —
the core builds absolute URLs from `window.location.href` and the destination is
resolved from the clicked anchor's href, which about:blank cannot base — and
installs it as the global before `FC(...)` defines the island, so the element
registry, hydration, and runtime share one consistent window. It also installs a
minimal `window.navigation` stub that records the `navigate` listener, so the test
can emit the navigate event a real browser would synthesise from the link click
(jsdom does not) and then run the handler the browser would await.

## Expected initial state

Red: the suite fails to load because `index.ts` does not yet export `bootstrap`
or `onFirstLoad`, and no interceptor is installed. Passing it is the definition of
done for this cycle.

## Deliberately out of scope (deferred to this cycle's plan / inner-loop unit tests)

The feature test encodes the single happy-path user story. The remaining-M1 edge
and failure paths belong in the plan's unit-test steps, not this end-to-end test:

- **Non-2xx / network-error full-load fallback** — `fetch` failure aborts the
  same-document path and falls back to `location.assign(url)` (the live `// TODO`
  in `fetchDocument`, design "Failure modes"). Awkward to assert end-to-end in
  jsdom (it does not navigate); a focused unit test stubs `location.assign`.
- **Decline checks** — the `navigate` listener declines (no `event.intercept`, no
  core run) when `!canIntercept` (cross-origin, etc.), `hashChange`,
  `downloadRequest`, or `formData` is set (design §2). Triangulated by unit tests
  that emit a `navigate` event with each field set.
- **No-Navigation-API browsers** — `installInterceptor` is a no-op; links perform
  normal full-document navigations. The minimal alternative, no fallback runtime.
- **Back/forward** — handled by the same `navigate` listener (the Navigation API
  fires `navigate` with `navigationType: "traverse"`); no separate `popstate` path.
- **`onFirstLoad` registered after first load** fires immediately with the
  retained context (design §1).

## Final refactor + review

The topic-closing `developer:refactor` + `general:review` pass is already tracked
in `docs/developer/TASKS.md` ("Final refactor + review for route hydration"),
to run once the remaining milestones land.
