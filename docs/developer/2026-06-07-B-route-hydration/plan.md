# Implementation Plan: Route Hydration — remaining M1 (auto-bootstrap + interceptor)

**Feature test:** `src/dom/navigation/interceptor.test.ts`

**User story:** A built page loads server-rendered; the runtime bootstraps (hydrates
the initial page and fires `onFirstLoad` once), and a same-origin link click is
intercepted into a same-document navigation (history pushed, head + body swapped,
module imported, island hydrated, `onNavigate` fired) with no full reload.

**Steps:**
- [ ] Step 1: `onFirstLoad` hook + retained first-load context
- [ ] Step 2: `bootstrap()` — hydrate initial page + fire `onFirstLoad`
- [ ] Step 3: Interceptor install + click fallback claim — **feature test passes here**
- [ ] Step 4: Decline guards (unit tests)
- [ ] Step 5: `popstate` back/forward (unit test)
- [ ] Step 6: `fetch`-failure full-load fallback (unit tests)

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
- **History bookkeeping lives in the fallback, not the core.** `navigate()` does not
  call `history.pushState`. The click handler pushes (Step 3); `popstate` re-runs the
  core without pushing (Step 5). Keeping the core pushState-free is what lets both
  paths share it.

A note on "auto-bootstrap": the entry is the explicit `bootstrap()` function.
*Automatic* invocation on a real document load is M3's concern (the injected runtime
entry calls `bootstrap()`); the runtime itself stays import-side-effect-free so tests
and the M3 injector decide when it runs.

## Step 1: `onFirstLoad` hook + retained first-load context

**Enables:** the `onFirstLoad` name in the suite's `import { bootstrap, onFirstLoad,
onNavigate }` (the module still fails to load until Step 2 adds `bootstrap`, but this
is the first half of resolving that import), and the deferred "registered after first
load fires immediately with the retained context" behavior (design §1).

Add the registration API and the retained-context mechanism. Module-level state only —
no listeners, no DOM, no `start()` at import time.

```ts
/** A hook registered through `onFirstLoad`, run once when the initial page hydrates. */
type FirstLoadCallback = (ctx: NavigationContext) => void;

/** Hooks awaiting the first load, fired once during bootstrap in registration order. */
const firstLoadCallbacks: FirstLoadCallback[] = [];

/**
 * The first-load context, set by `bootstrap()` once the initial page hydrates.
 * `undefined` until then. Retained so an `onFirstLoad` registered AFTER first load
 * (e.g. a shell module that imports the runtime lazily) still receives the event.
 */
let firstLoadContext: NavigationContext | undefined;

/**
 * Register `cb` to run once, when the initial page hydrates on first document load.
 * Invariant: if registered BEFORE bootstrap, `cb` is queued and fired during
 * bootstrap with the first-load context (`type: "first"`). If registered AFTER first
 * load, `cb` is invoked immediately with the retained context, so a late
 * registration never drops the initial event (design §1). Registering installs no
 * listeners and touches no DOM (import-side-effect-free invariant).
 */
export function onFirstLoad(cb: FirstLoadCallback): void;
```

Unit angle (inner loop): registering before "first load" queues; registering after a
simulated first-load context fires immediately with that context. Existing tests
(`navigation.test.ts`) keep passing — no change to `navigate`/`onNavigate`.

## Step 2: `bootstrap()` — hydrate initial page + fire `onFirstLoad`

**Enables:** the suite now *loads* (both `bootstrap` and `onFirstLoad` exported), and
the first block of feature-test assertions passes — page A's island responds to a
click after `await bootstrap()` ("Hello A-home (1)"), and `onFirstLoad` fired exactly
once with `type: "first"`, `url.href === "https://example.test/a"`, `title === "Page
A"`. The test still fails at Act 2 (`clickEvent.defaultPrevented` is `false` — no
interceptor yet).

```ts
/**
 * Bootstrap route hydration for the initial document. Explicit entry — NOT run at
 * import time (the module stays side-effect-free; tests and the M3 injected entry
 * decide when this runs). On call it:
 *   1. `start(window.document.body)` — hydrate the server-rendered initial islands
 *      in place (reads the initial `#__hydration` payload already in <head>).
 *   2. Build the first-load `NavigationContext`: `url` from `window.location.href`,
 *      `title` from `document.title`, `type: "first"`. Store it in `firstLoadContext`.
 *   3. Fire every queued `onFirstLoad` callback once, in registration order.
 * (Step 3 inserts interceptor installation between (1) and (3), per design §1.)
 * Invariant: `onFirstLoad` fires exactly once per bootstrap.
 */
export async function bootstrap(): Promise<void>;
```

Existing tests keep passing. `start` is the unchanged `src/dom/hydrate.ts` export
(`start(root?: ParentNode): void`).

## Step 3: Interceptor install + click fallback claim

**Enables:** the rest of the feature test — Act 2 and everything after. After the
link click: `clickEvent.defaultPrevented === true`, `window.location.href ===
"https://example.test/b"` (history pushed); then the already-built core runs and the
async assertions pass (fetched `/b`, shell node preserved by identity, `document.title
=== "Page B"`, meta description swapped, `__pageBModuleRan === true`, body swapped +
destination island hydrated and interactive, `onNavigate` fired once with page B's url
and title). **The feature test passes at the end of this step.**

Add the interceptor selection and the fallback click handler, wired into `bootstrap()`.

```ts
/**
 * Install the navigation interceptor for the current environment. Chooses the
 * Navigation API path when `"navigation" in window` (the primary path — exercised
 * manually, not reachable under jsdom), otherwise the click + `popstate` fallback
 * (design §8). Called by `bootstrap()` after `start()` and before firing `onFirstLoad`.
 */
function installInterceptor(): void;
```

Fallback click handler — a single delegated `click` listener on `document`:

- Resolve the clicked anchor (walk up from `event.target`); if none, ignore.
- Claim a same-origin, primary-button, unmodified, non-download anchor click:
  `event.preventDefault()`, `history.pushState(null, "", url)`, then `navigate(url)`.
  (`navigate` already resolves the URL, fetches, reconciles, swaps, imports, hydrates,
  and fires `onNavigate`.)
- Otherwise return without `preventDefault` so the browser navigates natively. The
  full decline matrix is triangulated in Step 4 — this step implements only enough to
  claim the feature test's plain same-origin click.

Wire `installInterceptor()` into `bootstrap()` between step (1) `start()` and step (3)
`onFirstLoad` firing. The listener is added only inside `installInterceptor`, never at
module top level — import stays side-effect-free.

## Step 4: Decline guards (unit tests)

**Enables:** the deferred "Decline guards" behaviors. The single happy-path feature
test cannot force these (claiming every click would still pass it), so triangulate
each decline with a focused unit test asserting the interceptor does **not**
`preventDefault` and does **not** run the core (e.g. `fetch` was never called). The
guards (design §2):

- **cross-origin** — anchor href on another origin.
- **download** — anchor carries a `download` attribute.
- **`target="_blank"`** — any non-default target.
- **modifier / non-primary button** — `ctrl`/`meta`/`shift`/`alt` held, or
  `button !== 0`.
- **hash-only within the current document** — same path, only the `#fragment` differs;
  let the browser scroll natively.
- **non-GET** — anchor clicks are GET, so this guard records that the handler claims
  only anchor navigations and never form submissions (forms are out of scope per the
  design Summary); assert a non-anchor / form target is not claimed.

Implementation: harden the Step 3 handler's claim condition to apply each guard. Feature
test stays green throughout.

## Step 5: `popstate` back/forward (unit test)

**Enables:** the deferred "`popstate` / back-forward" behavior (design §8). The
fallback installs a `popstate` listener that re-runs the shared core for the current
location on back/forward.

```ts
// popstate listener (installed by installInterceptor alongside the click handler in
// the fallback path): on back/forward, run navigate(window.location.href) — re-render
// the document for the entry the browser restored. No history.pushState here: the
// browser already moved the entry, and the core is pushState-free (see invariants).
```

Unit test against constructed history: arrange a current location, dispatch a
`popstate` event, assert the core ran for the restored location (fetched it, swapped
body). Feature test stays green.

## Step 6: `fetch`-failure full-load fallback (unit tests)

**Enables:** the deferred "non-2xx / network-error full-load fallback" — the live
`// TODO(interceptor wiring)` in `fetchDocument` (design "Failure modes"). On a non-2xx
response or a network error, abort the same-document path and fall back to a full load.

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
4–6). The topic-closing `developer:refactor` + `general:review` pass over the
interceptor + fallback is already tracked in `docs/developer/TASKS.md` and runs once
the later milestones (M2–M4) land.
