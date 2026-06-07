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

jsdom has no Navigation API (`"navigation" in window` is false), so the runtime
installs the **click + `popstate` fallback** (design §8) — the path this test
drives. The fallback interceptor needs a *real origin* (it resolves the clicked
anchor's href, decides same-origin against `location.origin`, and calls
`history.pushState`), which jsdom's default about:blank window cannot provide. The
suite therefore boots its own real-URL window (`https://example.test/a`) and
installs it as the global before `FC(...)` defines the island, so the element
registry, hydration, and runtime share one consistent window. (The M1-core test
sidestepped this by driving `navigate()` with absolute URLs; the interceptor
cannot, because it derives the URL from the DOM.)

## Expected initial state

Red: the suite fails to load because `index.ts` does not yet export `bootstrap`
or `onFirstLoad`, and no interceptor is installed. Passing it is the definition of
done for this cycle.

## Deliberately out of scope (deferred to this cycle's plan / inner-loop unit tests)

The feature test encodes the single happy-path user story. The remaining-M1 edge
and failure paths the user selected belong in the plan's unit-test steps, not this
end-to-end test:

- **Non-2xx / network-error full-load fallback** — `fetch` failure aborts the
  same-document path and falls back to `location.assign(url)` (the live `// TODO`
  in `fetchDocument`, design "Failure modes"). Awkward to assert end-to-end in
  jsdom (it does not navigate); a focused unit test stubs `location.assign`.
- **`popstate` / back-forward** — the fallback re-runs the core for the current
  location on back/forward (design §8). Unit-tested against constructed history.
- **Decline guards** — cross-origin, download, `target=_blank`, modifier-key /
  non-primary-button, hash-only-within-document, non-GET (design §2): the
  interceptor must let the browser handle these natively (no `preventDefault`, no
  core run).
- **Navigation API primary path** — not reachable under jsdom; covered by the
  fallback here and exercised manually (design "Verification → Manual").
- **`onFirstLoad` registered after first load** fires immediately with the
  retained context (design §1).

## Final refactor + review

The topic-closing `developer:refactor` + `general:review` pass is already tracked
in `docs/developer/TASKS.md` ("Final refactor + review for route hydration"),
to run once the remaining milestones land.
