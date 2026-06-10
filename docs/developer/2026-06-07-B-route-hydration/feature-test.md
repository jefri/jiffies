# Feature Test: M2 — View Transitions on same-document navigation

Milestone M2 of the route-hydration topic. The design's build-sequence labels M2
"Fallback + View Transitions," but the topic pivoted to Navigation-API-only
(commit `a7cc47b`), so the fallback half is dropped. **M2 is View Transitions
only**, per the surviving spec in [design.md](design.md) §2 step 4 and the
failure-mode table. (Reconciling the design doc's stale build-sequence wording is
topic-close cleanup, tracked separately, not part of this milestone.)

## User Story

**Given** a hydrated, multi-page site whose browser supports same-document View
Transitions (`document.startViewTransition`),

**When** a visitor follows an in-app link and the browser has not already animated
the navigation itself (`event.hasUAVisualTransition` is false),

**Then** the runtime swaps the page body *inside* a View Transition, so the
destination appears through one browser-animated transition rather than an abrupt
replacement — and the destination still renders, applies its per-page metadata,
hydrates, and is interactive, exactly as a direct swap would produce.

## Executable Feature Test

`src/dom/navigation/view-transitions.test.ts`

The test drives the full realistic interception path — `bootstrap()` installs the
Navigation API listener; the browser's `navigate` event is emitted for the clicked
link with `hasUAVisualTransition: false`; the interceptor claims it — because the
View-Transition guard reads `event.hasUAVisualTransition`, a field only the
interception path sees. It stubs `document.startViewTransition` (jsdom has none),
recording each call and the body content captured *at the instant the transition
begins, before its callback runs*.

It asserts:

- `document.startViewTransition` wrapped the swap **exactly once** (`vtCalls === 1`).
  This is the genuine red: today `navigate()` calls `swapBody` directly and never
  reaches `startViewTransition`, and the interceptor never threads the event into
  the core.
- The swap happened **inside** the transition callback: at transition start the
  body still showed page A (`/Hello A-home/`); only running the callback swapped in
  page B. That before/after gap is what the browser animates.
- The outcome is **identical to a direct swap**: `document.title` is the
  destination's, the run-once `[data-shell]` node survived by identity, page B's
  island replaced page A's, hydrated with page B's payload, and is interactive
  after a click (hydration ran post-swap). `onNavigate` fired exactly once with the
  destination URL and title.

## Forces the implementation to

- Thread the `NavigateEvent` (or at least `hasUAVisualTransition`) from
  `installInterceptor` into the same-document core, which today receives only a URL
  ([index.ts:198](../../../src/dom/navigation/index.ts#L198),
  [index.ts:240-254](../../../src/dom/navigation/index.ts#L240-L254)).
- Wrap the `swapBody` call ([index.ts:203](../../../src/dom/navigation/index.ts#L203))
  in `document.startViewTransition(() => swapBody(...))` when it exists and
  `hasUAVisualTransition` is false, awaiting the swap before importing modules and
  hydrating; otherwise swap directly.

## Out of scope for this feature test (planning-step / unit-level)

Kept out of the single end-to-end story, to be covered by unit tests in the plan
(mirroring how `interceptor.unit.test.ts` covers M1 edge cases beyond the
`interceptor.test.ts` lifecycle story). Likely `view-transitions.unit.test.ts`:

- **UA-transition guard.** `hasUAVisualTransition: true` → the runtime does NOT
  call `startViewTransition` (the browser already animated it); the swap is applied
  directly and the outcome is still correct.
- **Progressive-enhancement fallback.** `document.startViewTransition` absent → the
  swap is applied directly, no error, outcome correct (design "Failure modes":
  "startViewTransition unsupported or hasUAVisualTransition true → body swap applied
  directly").
- **`NavigationContext.type` reflecting `event.navigationType`** ("push" |
  "traverse" | "replace") instead of the hardcoded `"push"`
  ([index.ts:215](../../../src/dom/navigation/index.ts#L215)). Optional secondary
  scope from the TASKS M2 note; fold into the plan if kept.

## Refactor note (carried from remaining-M1)

`view-transitions.test.ts` is the **third** Navigation-API suite to duplicate the
real-origin window + navigation stub + `emitNavigate` harness (after
`interceptor.test.ts` and `interceptor.unit.test.ts`). That is the Three-Strikes
trigger recorded in
[refactor-plan-remaining-m1.md](refactor-plan-remaining-m1.md) "Deferred". The M2
refactor step should extract a shared `interceptor.testenv.ts` and adopt it across
all three suites. The feature-test phase only writes the test, so the harness is
duplicated for now.
