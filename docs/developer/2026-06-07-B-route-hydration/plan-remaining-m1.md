# Implementation Plan: Route Hydration — remaining M1 (auto-bootstrap + interceptor)

**Feature test:** `src/dom/navigation/interceptor.test.ts`

**User story:** A built page loads server-rendered; the runtime bootstraps (hydrates
the initial page and fires `onFirstLoad` once), and an in-app navigation is
intercepted into a same-document transition (head + body swapped, module imported,
island hydrated, `onNavigate` fired) with no full reload.

## Interception mechanism: Navigation API only

This cycle uses the **Navigation API as the sole interception mechanism** (design
§2/§8). It delivers one `navigate` event for every same-document candidate — link
click, programmatic navigation, and back/forward — so a single listener replaces a
click handler *and* a `popstate` listener, and the API owns history and scroll
restoration (the core stays `history.pushState`-free).

The Navigation API is Baseline as of Jan 2026; this project targets evergreen
browsers. Where it is absent there is **no interception and no fallback runtime**:
links perform ordinary full-document navigations — degraded (no shared-runtime
hydration) but never broken. That minimal alternative is the entire fallback. A
click/`popstate` shim is explicitly **not** built (earlier drafts of this plan had
one; it was dropped — evergreen-only, minimal alternative, no more).

Types for `window.navigation` come from `@types/dom-navigation` (a dev dependency).
TypeScript folds these into `lib.dom.d.ts` as of TS 6.0; a task in
`docs/developer/TASKS.md` tracks dropping the dependency then.

**Steps:**

- [x] Step 1: `onFirstLoad` hook + retained first-load context
- [x] Step 2: `bootstrap()` — hydrate initial page + fire `onFirstLoad`
- [x] Step 3: Navigation API interceptor (claim + decline) — **feature test passes here**
- [ ] Step 4: Decline checks (unit tests)
- [ ] Step 5: `fetch`-failure full-load fallback (unit tests)

## Step 0: Domain model — not needed

This cycle introduces no new domain objects. The two new exports (`onFirstLoad`,
`bootstrap`) are functions, and both reuse the existing `NavigationContext`
interface (already carrying the `"first"` variant of `type`). No new entity, value
object, or service is required, so there is no Step 0.

## Invariants preserved across every step

These hold before this cycle and must still hold after each step (existing tests
guard them; do not regress):

- **Import is side-effect-free.** Importing `./index.ts` installs no listeners,
  touches no DOM, and never calls `start()` (see the module comment, commit
  `6023427`). All side effects live inside the explicit `bootstrap()` entry. This is
  why the feature test can import the module, arrange page A's DOM and the `fetch`
  stub, register hooks, and only *then* call `bootstrap()`.
- **The shared core is reused unchanged.** `navigate(url)` already does fetch →
  `reconcileHead` → `swapBody` → `importPageModules` → `start()` → `onNavigate`.
  Steps below add only the entry layer around it; they must not change its signature
  or duplicate its body.
- **History bookkeeping is the Navigation API's, never the core's.** `navigate()`
  does not call `history.pushState`. The Navigation API commits the history entry
  for the intercepted navigation (and already moved it for back/forward), so the
  intercept handler just runs the core. Keeping the core history-free is what lets a
  single `navigate` listener serve push, replace, and traverse alike.

A note on "auto-bootstrap": the entry is the explicit `bootstrap()` function.
*Automatic* invocation on a real document load is M3's concern (the injected runtime
entry calls `bootstrap()`); the runtime itself stays import-side-effect-free so tests
and the M3 injector decide when it runs.

## Step 1: `onFirstLoad` hook + retained first-load context — done

Added `onFirstLoad`, the `FirstLoadCallback` type, and the module-level
`firstLoadCallbacks` queue + retained `firstLoadContext`. Registering before
bootstrap queues; registering after first load fires immediately against the
retained context, so a late shell registration never drops the initial event
(design §1). Module-level state only — no listeners, no DOM, no `start()` at import
time. Covered by `interceptor.unit.test.ts` (registered-after-first-load) and the
feature test's Act 1 (registered-before).

## Step 2: `bootstrap()` — hydrate initial page + fire `onFirstLoad` — done

`bootstrap()` is the explicit, import-side-effect-free entry. On call it:
`start(window.document.body)` (hydrate the server-rendered initial islands),
`installInterceptor()` (Step 3), build + retain the first-load `NavigationContext`
(`type: "first"`), then fire every queued `onFirstLoad` once and clear the queue.
The feature test's Act 1 (initial-page hydration + `onFirstLoad`) passes after this
step; it stopped at Act 2 until Step 3 installed the interceptor.

## Step 3: Navigation API interceptor (claim + decline) — done

`installInterceptor()` (called by `bootstrap()` between `start()` and firing
`onFirstLoad`, design §1) returns immediately when `"navigation" in window` is false
(the minimal no-interception alternative). Otherwise it registers a single
`window.navigation` `navigate` listener that:

- **Declines** (returns without `intercept`, letting the browser navigate natively)
  when `!event.canIntercept` (cross-origin, etc.), `event.hashChange`,
  `event.downloadRequest !== null`, or `event.formData !== null` (form submission —
  out of scope, design §2/Summary).
- **Claims** otherwise: `event.intercept({ handler: () => navigate(event.destination.url) })`.
  The shared core runs as the same-document transition; the API commits history.

The listener is added only inside `installInterceptor`, never at module top level —
import stays side-effect-free. **The feature test passes at the end of this step.**

The feature test drives this under jsdom (which has no Navigation API) with a minimal
`window.navigation` stub that records the listener; Act 2 emits the `navigate` event a
real browser synthesises from a link click, then awaits the captured `intercept`
handler. The Navigation API path is otherwise exercised manually (design
"Verification → Manual").

## Step 4: Decline checks (unit tests)

**Enables:** the deferred decline behaviors. The single happy-path feature test
cannot force these (claiming every navigation would still pass it), so triangulate
each decline with a focused unit test that emits a `navigate` event with the relevant
field set and asserts the interceptor did **not** call `event.intercept` and did
**not** run the core (`fetch` was never called). The checks (design §2):

- **`!canIntercept`** — the API itself forbids interception (cross-origin and other
  non-same-document navigations surface here).
- **`hashChange`** — a hash-only change within the current document; let the browser
  scroll natively.
- **`downloadRequest !== null`** — a download navigation.
- **`formData !== null`** — a form submission (non-GET); forms are out of scope.

Implementation is already in the Step 3 handler; Step 4 adds the unit tests that pin
each branch. They share the `interceptor.unit.test.ts` Navigation API stub (extended
so `emitNavigate` can set these fields). Feature test stays green.

## Step 5: `fetch`-failure full-load fallback (unit tests)

**Enables:** the live `// TODO(interceptor wiring)` in `fetchDocument` (design
"Failure modes"). On a non-2xx response or a network error, abort the same-document
path and fall back to a full load.

```ts
// In fetchDocument / navigate: if (!response.ok) OR fetch rejects → window.location
// .assign(url) and abort — do NOT parse, reconcile, swap, or fire onNavigate. The
// destination becomes a normal full document load (no broken intermediate state).
```

Unit tests (stub `location.assign`, which does not navigate under jsdom): a non-2xx
status (e.g. 500) calls `location.assign(url)` and performs no body swap; a rejected
`fetch` (network error) likewise calls `location.assign(url)`. Removes the `// TODO`.
Feature test stays green.

## Definition of done for this cycle

`src/dom/navigation/interceptor.test.ts` passes (Step 3), and every behavior the
feature-test deferred to the plan is covered by a unit test and implemented (Steps
4–5). The topic-closing `developer:refactor` + `general:review` pass over the
interceptor + fallback is already tracked in `docs/developer/TASKS.md` and runs once
the later milestones (M2–M4) land.
