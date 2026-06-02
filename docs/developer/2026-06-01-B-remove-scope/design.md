# Remove the in-house `scope` test framework

## Problem Statement

`jiffies` ships its own test microframework under `src/scope/`: a `describe`/`it`
registry (`describe.ts`), a tree executor (`execute.ts`), a jest-flavored
`expect` matcher set (`expect.ts`), a `cleanState` helper (`state.ts`), a `fix`
number-rounding helper (`fix.ts`), and three reporters (`display/console.ts`,
`display/junit.ts`, `display/dom.ts`). It is driven from `src/test.mjs`, which
imports `src/test_all.ts` to register every test by side effect, runs
`execute()`, and selects a reporter from `--mode` (`console` default, `junit`
for CI).

This is maintenance the platform now covers. Node 24 (engines `>=22.18.0`) ships
a stable `node:test` runner that runs `.ts` directly via type-stripping,
discovers test files, and emits JUnit XML through a built-in reporter. The
repo's recent trajectory — removing the ESM/CJS builds, dropping the `flags`
module for `node:util parseArgs`, loading JSDom under Node — is "use the
platform." `scope` is the next piece to retire.

The goal: delete the Node-side test framework and run the Node test suite on
`node:test` + `node:assert`, adding zero dependencies, while keeping the
browser-only DOM/component tests runnable.

## Prior Art

- **`node:test` + `node:assert`** — the chosen target. `describe`/`it`,
  `before`/`after`/`beforeEach`/`afterEach`, and the `junit` reporter are all
  built in. Verified working in this repo: `node --test --test-reporter=junit`
  already discovers and runs `*.test.ts` here.
- **The existing `scope` framework** — its `expect` matchers
  (`toBe`/`toEqual`/`toMatch`/`toMatchObject`/`toBeNull`/`toThrow`/`.not`) and
  `cleanState` define the assertion vocabulary the 15 test files use today. The
  matchers depend only on `assert.ts`/`display.ts`/`equal.ts` (all
  browser-safe), never on the runner.
- **`src/index.html`** — the in-browser test harness. It loads `test_all.js`,
  `dom/test.js`, and `components/test.js`, then imports four things from
  `scope`: `execute` (`execute.ts`), `displayStatistics` (`display/dom.ts`),
  `onConsole` (`display/console.ts`), and `asXML` (`display/junit.ts`). It runs
  `execute()`, renders via `displayStatistics`, and writes three hidden page
  blocks — `status` (fail count), `json` (raw results), and `xml` (`asXML`
  output) — wrapped in `--- START_X ---`/`--- END ---` markers. Those markers
  are a browser-CI scrape contract: an external driver reads the rendered page.
  This is the *only* execution path for the DOM tests; under plain
  `node ./src/test.mjs` they are skipped because `IsBrowser` is `false` at
  import time (jsdom in `dom.ts` loads later).
- **The recent `flags` → `node:util parseArgs` migration (#35)** — the
  precedent for this work: delete bespoke code, adopt the Node built-in, add no
  dependency.

## Metrics

The migration is correct when all of the following hold:

- `npm test` runs the Node test suite via `node --test` and exits non-zero on
  failure.
- `npm run ci` emits JUnit XML via the built-in reporter (this also retires the
  malformed `npm run node ...` invocation; the standalone `ci`-script task
  remains tracked separately but is satisfied here).
- All 9 Node-side test files pass under `node:test`/`node:assert`. These are
  the files `src/test_all.ts` imports directly today: `context`, `diff`,
  `equal`, `fs`, `generator`, `lock`, `result`, `observable/observable`,
  `server/main`.
- `node --test` does **not** attempt to run the browser-only tests
  (`dom/html`, `dom/fc`, `dom/observable`, `dom/form/form`,
  `components/virtual_scroll`) — today they error under it.
- The two files that are **not run by any harness today** are handled
  deliberately, not silently swept into the new default discovery (see
  Specification → Orphaned files): `src/fs_win.test.ts` (a manual `scandir`
  script with no assertions) and `src/dom/form/form.test.ts` (a browser test
  `dom/test.ts` never loads).
- The DOM/component tests still run via `src/index.html` in a real browser.
- Net production/dev dependencies added: **0**.
- `src/scope/` no longer contains a Node test runner; only the browser-harness
  slice survives (see Specification).

## Specification

### Framework: `node:test` + `node:assert`

Node tests register with `describe`/`it`/`beforeEach` imported from `node:test`
and assert with `node:assert/strict`. The custom `expect` matchers are dropped
from the Node tests. The mapping:

| `scope` matcher | `node:assert/strict` |
|---|---|
| `expect(a).toBe(b)` | `assert.strictEqual(a, b)` |
| `expect(a).toEqual(b)` | `assert.deepStrictEqual(a, b)` |
| `expect(a).toEqual(b, true)` (partial) | `assert.partialDeepStrictEqual(a, b)` |
| `expect(a).toMatch(re)` | `assert.match(a, re)` / `assert.ok(a.includes(s))` |
| `expect(a).toMatchObject(o)` | `assert.partialDeepStrictEqual(a, o)` |
| `expect(a).toBeNull()` | `assert.strictEqual(a, null)` |
| `expect(fn).toThrow(msg)` | `assert.throws(fn, /msg/)` |
| `.not.toBe` / `.not.toEqual` | `assert.notStrictEqual` / `assert.notDeepStrictEqual` |

`partialDeepStrictEqual` is stable in Node 24, covering the `partial`/`toMatchObject`
cases.

### `cleanState`

Used once (`fs.test.ts`, with `beforeEach`). It returns a stable object whose
contents are reset before each test. Replace the single call site with the
idiomatic `node:test` pattern: a `let` bound in `beforeEach`. No helper is
carried into the Node suite.

### `fix`

Zero callers in the codebase (verified). Deleted with `scope`.

### Test discovery and the browser-test exclusion

`node --test` default-discovers every `*.test.ts` recursively — including the
browser tests, which then error because `scope`'s `describe`/`it` are not
`node:test` registrations. The browser tests must be excluded from discovery.

Approach: rename the browser-only test files off the `*.test.ts` discovery
pattern to a `*.browser-test.ts` convention, and have the browser entry import
them explicitly (the role `test_all.ts`/`loadTests()` plays today). Files:
`dom/html.test.ts`, `dom/fc.test.ts`, `dom/observable.test.ts`, and
`components/virtual_scroll.test.ts` (the four the browser actually loads today).
`node --test` then matches only Node `*.test.ts` files; the browser harness
owns its own list.

### Orphaned files

Two `*.test.ts` files are run by no harness today and must be handled
deliberately, because `node --test`'s default discovery would otherwise newly
execute them:

- **`src/fs_win.test.ts`** — not a test. It is a standalone script: it
  constructs a `NodeFileSystem`, `scandir`s the cwd, and `console.log`s the
  results, with no `describe`/`it` and no assertions. `node --test` would run it
  and emit stray stdout. Resolution: rename it off the `.test.ts` pattern (e.g.
  `fs_win.probe.ts`) or delete it. The red/green cycle decides; the default is
  to delete it unless it is a deliberate manual probe worth keeping.
- **`src/dom/form/form.test.ts`** — a browser DOM test that `dom/test.ts` does
  not load, so it never runs today. Resolution: rename it to the
  `*.browser-test.ts` convention and add it to the browser list (newly run in
  the browser), or leave it excluded if it is stale. Decide during planning by
  reading the file; do not silently expand coverage.

### JUnit / CI

For the Node suite, `src/test.mjs` is deleted and replaced by `package.json`
scripts:

- `"test": "node --test"`
- `"ci": "node --test --test-reporter=junit"`

The built-in `junit` reporter replaces `asXML` **for the Node CI path**. The
`--mode` switch and `parseArgs` block in `test.mjs` are gone.

Note: `display/console.ts` and `display/junit.ts` are **not** deleted — the
browser harness (`index.html`) still imports `onConsole` and `asXML` to render
and to populate the `json`/`xml` page-scrape blocks. They move from the Node
path to the browser harness. Only the Node entrypoint (`test.mjs`) and the Node
half of `test_all.ts` go away.

### The minimal browser harness

A browser cannot import `node:test` or `node:assert`, so the DOM tests keep
`expect()`. The browser-relevant slice of `scope` is therefore retained, not
deleted:

- **Kept (browser harness):** `expect.ts` (matchers) and its supporting
  `assert.ts` / `display.ts` / `equal.ts` (already top-level `src/` files); the
  registry + executor (`describe.ts`, `execute.ts`); and all three reporters
  the page uses — `display/dom.ts`, `display/console.ts`, `display/junit.ts`
  (`asXML`). These may stay under `src/scope/` or move to a browser-test
  module; placement is a Specification detail, not a behavior change.
- **Replaced:** `test_all.ts`. Today it registers the 9 Node tests *and* defers
  the browser tests to `loadTests()`. After migration the Node tests run under
  `node:test` and can no longer be imported in a browser, so `test_all` becomes
  a browser-only aggregator that imports just the `*.browser-test.ts` files and
  the existing `dom`/`components` loaders.
- **Deleted:** the Node entrypoint (`test.mjs`), `state.ts` (`cleanState`),
  `fix.ts`.
- `src/index.html` continues to import `execute`, `displayStatistics`,
  `onConsole`, and `asXML`, runs `execute()`, renders via `displayStatistics`,
  and preserves the `status`/`json`/`xml` page-scrape blocks. Its imports
  update to the harness's location and to the browser aggregator's new name.

The browser DOM tests are **not** rewritten to `node:assert` (it does not exist
in a browser); they keep `expect()`.

### Failure modes

- A browser test file accidentally left on the `*.test.ts` pattern: `node --test`
  picks it up and it errors. Caught by the metric "node --test does not run
  browser tests"; the fix is the rename convention.
- A `toEqual` partial-match semantic that `partialDeepStrictEqual` does not
  reproduce exactly: convert that specific assertion explicitly rather than
  relying on the table. Verified per-file during the red/green cycle.
- The `context.test.ts` migration overlaps the separately-tracked
  `using`/`await using` task; this migration only swaps its assertion calls and
  leaves the disposal semantics untouched.

### Verification

- Automated: `npm test` green across all 10 Node test files; `npm run ci`
  produces well-formed JUnit XML.
- Manual: open `src/index.html` in a browser, confirm the DOM/component tests
  register, execute, and render pass/fail counts as before.

## Alternatives

- **Vitest.** Its jest-compatible `expect` would map the matchers 1:1 and its
  built-in jsdom environment would absorb the browser tests. Rejected: it pulls
  in vite/esbuild and a large toolchain, directly against the repo's
  dependency-minimizing direction (no builds, native `parseArgs`, zero-dep
  `scope` replacement). The whole point of the task is to shed bespoke tooling,
  not trade it for a heavier external one.
- **Keep `scope`.** Rejected: it is exactly the maintenance burden this task
  exists to remove, and `node:test` covers the Node path natively.
- **Move DOM tests to jsdom under `node:test`.** jsdom already auto-loads under
  Node, so the DOM tests *could* run in CI via `node --test`. Rejected for this
  migration (chosen: preserve current gating) to keep scope tight; recorded as
  a deferred follow-up because it would let the browser harness be deleted
  entirely.
- **Drop the browser DOM tests.** Smallest footprint, but discards DOM coverage
  that exists today. Rejected: keep the tests, keep a minimal harness.

## Summary

Replace the Node-side `scope` framework with `node:test` + `node:assert`,
rewriting the 9 Node test files' assertions per the matcher-mapping table and
inlining the single `cleanState` use. Delete `test.mjs`, `state.ts`, and
`fix.ts`; convert `test_all.ts` into a browser-only aggregator. Retain the
browser-harness slice of `scope` (`expect`, `describe`/`it`/`execute`,
`display/dom.ts`, plus `display/console.ts` and `display/junit.ts` which
`index.html` still uses) so `src/index.html` keeps running the DOM/component
tests, renamed to a `*.browser-test.ts` convention to exclude them from
`node --test`. Handle the two orphaned files (`fs_win.test.ts`,
`dom/form/form.test.ts`) deliberately so default discovery does not silently
run them. Scripts become `node --test` and `node --test --test-reporter=junit`.
Zero dependencies added.

**Deferred decisions:**

- Final placement of the retained browser harness (stay in `src/scope/` vs. a
  new browser-test module). Decided during planning.
- Whether to later move the DOM tests to jsdom under `node:test` and delete the
  browser harness entirely — a separate task, gated on confirming jsdom-under-
  Node fidelity for the DOM/component suites.
- The exact per-assertion conversions where `partialDeepStrictEqual` semantics
  differ from the custom `equals(..., partial)` — resolved file-by-file in the
  red/green cycle, not pre-specified here.
