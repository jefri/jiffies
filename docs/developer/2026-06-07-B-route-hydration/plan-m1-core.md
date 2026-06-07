# Implementation Plan: Route Hydration — M1 same-document navigation core

**Feature test:** `src/dom/navigation/navigation.test.ts`
**User story:** Following an in-app link from one built page to another is a
same-document transition — the destination's HTML is fetched, its `<head>` is
reconciled (the `data-shell` node preserved by identity, per-page metadata and
the `__hydration` payload replaced), its `<body>` is swapped in, its module
script is imported, its island hydrates with the destination's props and responds
to input, and the navigation is reported exactly once.

**Steps:**
- [ ] Step 1: Module skeleton — exports, types, registry (test file loads)
- [ ] Step 2: Fetch + parse the destination document
- [ ] Step 3: Head reconciliation (preserve shell, replace per-page nodes)
- [ ] Step 4: Body swap + page-module import
- [ ] Step 5: Hydrate the swapped body + fire `onNavigate`

## Scope

This plan covers only what the feature test drives: the shared same-document core
`navigate(url)` (design §2 steps 1–7) and the `onNavigate` hook (design §1).

**Deliberately out of scope for this test** (no assertion exercises them; deferred
to the rest of M1's inner-loop unit tests and to M2 per the design's Build
sequence):

- Auto-bootstrap on import (`start()` of the initial page + `onFirstLoad`). The
  test arranges page A and calls `start()` itself. **Invariant for Step 1:**
  importing `./index.ts` must be side-effect-free under jsdom — it must not
  hydrate, must not install listeners, must not call `start()`. The bootstrap is
  wired in a later (non-test-bearing) M1 step / M2.
- The Navigation API interceptor and the click/`popstate` fallback (design §2,
  §8). jsdom has no Navigation API; the test drives `navigate(url)` directly.
- `onFirstLoad` and the retained-context replay behavior (design §1).

No new domain objects. `NavigationContext` is a plain internal interface
describing a completed navigation, not a domain entity.

## Step 1: Module skeleton — exports, types, registry

**Enables:** `import { navigate, onNavigate } from "./index.ts"` resolves, so the
test file loads instead of failing with `ERR_MODULE_NOT_FOUND`. No assertion
passes yet (every assertion still fails or the act still throws), but the rest of
the suite is unaffected and `check`/`test` run.

Create `src/dom/navigation/index.ts` with the public surface and an internal
callback registry. No fetch, no DOM work yet — `navigate` is an awaitable stub.

```ts
/**
 * Context describing a completed navigation, handed to every `onNavigate` hook
 * (e.g. an analytics pageview). Built by `navigate()` after the head reconcile,
 * so `title` reflects the destination and `url` is absolute.
 */
export interface NavigationContext {
  /** Absolute destination URL of the navigation. */
  url: URL;
  /** document.title after the head reconcile for this navigation. */
  title: string;
  /**
   * "first" on initial load; "push" | "traverse" | "replace" thereafter.
   * Present for shell hooks that distinguish entry kinds; the M1 core always
   * reports "push" for a programmatic `navigate()`.
   */
  type: "first" | "push" | "traverse" | "replace";
}

/**
 * Register `cb` to run after every in-app navigation completes (body swapped and
 * hydration scheduled). Invariant: callbacks fire exactly once per navigation,
 * in registration order, with the navigation's `NavigationContext`. Used by
 * shell code such as a GA `page_view`.
 */
export function onNavigate(cb: (ctx: NavigationContext) => void): void;

/**
 * The shared same-document core that both the Navigation API interceptor and the
 * click/`popstate` fallback funnel into (design §8). Fetches the destination's
 * built HTML, reconciles `<head>`, swaps `<body>`, imports the destination's page
 * modules, hydrates, then fires `onNavigate`. Resolves when hydration has been
 * scheduled and hooks have fired. Implemented incrementally across steps 2–5.
 */
export function navigate(url: string | URL): Promise<void>;
```

## Step 2: Fetch + parse the destination document

**Enables:** the assertion `fetchedUrl?.endsWith("/b")` — `navigate()` performs
the network fetch the test's stub records.

`navigate(url)` resolves `url` to an absolute `URL`, `fetch`es it, reads the
response text, and parses it into a detached `Document` with `DOMParser`. Both
`fetch` and `DOMParser` are resolved as globals (the test stubs `fetch` and shims
`globalThis.DOMParser` from `window`, mirroring how `dom.ts` hoists DOM globals).

Document the contract that the parsed document is detached (not yet adopted into
the live document) and that a later step adopts nodes via `document.importNode`.
A non-2xx / network-error fallback to a full load is a design failure-mode but is
**not** exercised by this test; leave a documented TODO rather than implementing
the fallback (it belongs with the interceptor wiring).

```ts
/**
 * Fetch `url` and parse its body text into a detached Document via the global
 * DOMParser. Returns the parsed document; the caller reconciles head and body
 * out of it. Invariant: the returned document is detached — its nodes must be
 * adopted with `document.importNode` before insertion into the live document.
 */
declare function fetchDocument(url: URL): Promise<Document>;
```

## Step 3: Head reconciliation (preserve shell, replace per-page nodes)

**Enables:** the run-once and navigation-correctness head assertions —

- `querySelectorAll("[data-shell]").length === 1` and the live shell node is the
  *same object* (`strictEqual`): preserved by identity, the destination's copy not
  appended;
- `document.title === "Page B"`;
- `meta[name="description"]` content is the destination's.

Implement a head-specific reconciler that diffs the live `<head>` against the
detached document's `<head>` as two groups (design §3):

- **Shell nodes** (`[data-shell]`) — left untouched. Never removed, re-inserted,
  or re-executed. The destination's shell nodes are dropped (the live ones already
  cover them). **Invariant:** the live shell node's identity is preserved, which
  is the whole run-once guarantee.
- **Per-page nodes** (everything else: `<title>`, `<meta>`, the `#__hydration`
  payload script) — replaced with the destination's non-shell head nodes (adopted
  via `importNode`). `<title>` is applied through `document.title` so it takes
  effect immediately. **Invariant:** the destination's `#__hydration` script is in
  the document *before* `start()` runs (Step 5), so islands hydrate with the
  destination's props.

`<html lang>` is updated from the destination when it differs (design §3).
Structural matching of metadata (tag + `name`/`property`/`rel`) is an optimization,
not a correctness requirement — a replace-the-set strategy is acceptable for M1.

```ts
/**
 * Reconcile the live `<head>` against `destHead`. Preserves every existing
 * `[data-shell]` node by identity; replaces all non-shell live nodes with
 * `destHead`'s non-shell nodes (adopted into the live document). Applies the
 * destination `<title>` via `document.title`. Leaves the destination
 * `#__hydration` payload in place for the subsequent `start()`.
 */
declare function reconcileHead(destHead: HTMLHeadElement): void;
```

## Step 4: Body swap + page-module import

**Enables:** the body-swap and module-import assertions —

- exactly one `route-greeting` after the swap, and it is **not** `pageAIsland`
  (the body was replaced, not patched in place);
- `globalThis.__pageBModuleRan === true` — the destination's inline
  `import "<spec>";` was extracted and `import()`d.

Two parts:

1. **Swap `<body>`.** Replace the live `<body>`'s children with the destination
   body's children, adopted via `document.importNode(node, true)`. **Invariant:**
   new element instances replace the old ones (the test asserts
   `notStrictEqual(island, pageAIsland)`), so this is a child replacement, not an
   in-place patch. The `<script type="module">` node is carried over inert — a
   `<script>` inserted via DOM does not execute (research §3), which is exactly why
   part 2 imports it explicitly.
2. **Import page modules.** Parse the `import "<spec>";` specifiers out of the
   destination body's `<script type="module">` text (the build emits inline
   `import` statements, not `src` attributes — design §2.5, matching
   `src/ssg/rewrite.ts`), and `import()` each, awaiting all. The ES module cache
   dedupes already-loaded chunks. **Invariant:** modules are imported before
   hydration so a not-yet-defined element is defined before `start()` (here the
   element is already defined; the test proves the import ran via the data: URL's
   side effect).

```ts
/** Replace the live <body> children with `destBody`'s children, adopted via
 *  document.importNode. Returns nothing; mutates the live document. */
declare function swapBody(destBody: HTMLBodyElement): void;

/** Extract every `import "<spec>";` specifier from `root`'s
 *  `<script type="module">` elements and dynamically import each, awaiting all.
 *  Inert script nodes inserted via DOM never execute on their own. */
declare function importPageModules(root: ParentNode): Promise<void>;
```

## Step 5: Hydrate the swapped body + fire `onNavigate`

**Enables:** the remaining assertions, making the feature test pass —

- the destination island hydrates with the destination payload
  (`textContent === "Hello B-about (0)"`) and a click runs its live handler
  (`"Hello B-about (1)"`);
- `onNavigate` fired exactly once, with `ctx.title === "Page B"` and
  `ctx.url.href === "https://example.test/b"`.

After the body swap and module import, call the existing `start()`
(`src/dom/hydrate.ts`) to hydrate the swapped-in body. It reads the destination
`#__hydration` payload (placed by Step 3) and hydrates each island in place;
`start()` schedules hydration on a `whenDefined` microtask, which the test flushes
with a macrotask `tick()`.

Then build the `NavigationContext` (`url` absolute, `title` = `document.title`
after the reconcile, `type: "push"`) and invoke every registered `onNavigate`
callback once, in registration order. **Invariant:** exactly one `onNavigate`
call per `navigate()`; hooks observe the destination title and URL. Order within
`navigate()`: reconcile head → swap body → import modules → `start()` →
`onNavigate`.
