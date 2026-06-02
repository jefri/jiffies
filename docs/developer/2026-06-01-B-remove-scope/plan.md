# Implementation Plan: Remove the in-house `scope` test framework

**Feature test:** `src/migrate_scope.feature.ts` (run explicitly:
`node --test src/migrate_scope.feature.ts` — it is `*.feature.ts`, not
`*.test.ts`, so `node --test` discovery ignores it and the `npm test` subprocess
it spawns does not recurse).

**User story:** A developer runs the project's test commands and gets the
platform runner (`node:test` + `node:assert`) for the Node suite, the browser
DOM tests are not picked up, `npm run ci` emits JUnit XML, the Node-side `scope`
runner is gone while the browser-harness slice survives, and zero dependencies
were added.

**No Step 0 (domain model).** This is a tooling/build migration. It introduces
no entities, value objects, or domain services — only file moves, assertion
rewrites, and `package.json` script changes. The domain stays untouched.

**Steps:**
- [x] Step 1: Exclude browser tests from discovery; delete the two orphans
- [x] Step 2: Switch the Node entrypoint to `node --test`
- [x] Step 3: Migrate the eight straight-matcher Node test files
- [x] Step 4: Migrate `fs.test.ts` (inline `cleanState`)
- [x] Step 5: Delete the dead Node-side `scope` pieces

All steps complete; `src/migrate_scope.feature.ts` passes 5/5. Remaining:
the finishing pass tracked in `TASKS.md` (general:review, developer:refactor,
manual `src/index.html` browser check, then developer:cleanup which also
removes the feature scaffold).

---

## The ordering invariant

Every step must leave `npm run all` (`biome check` + the project test command)
green, even while the feature test is still red. A test file migrated to
`node:test` no longer executes under `scope`'s `execute()`, and `node --test`
errors on the browser tests (`HTMLElement is not defined`). The sequence below
is the order that keeps a real, passing safety net at every commit boundary:

1. exclude the browser tests **before** flipping the runner (Step 1),
2. flip the runner **before** migrating files (Step 2) — unmigrated `scope`
   files register zero `node:test` cases, so `node --test` discovers them,
   imports them harmlessly, and exits 0,
3. migrate the Node files into the now-live `node:test` discovery (Steps 3–4),
4. delete the orphaned `scope` runner pieces only once nothing imports them
   (Step 5).

---

## Step 1: Exclude browser tests from discovery; delete the two orphans

**Enables:** The file-rename/removal half of the feature test's
*"does not run the browser-only DOM/component tests"* assertion — the four
`*.browser.ts` files exist and the four `*.test.ts` originals are gone.

Rename the four browser-only test files off the `node --test` discovery
patterns, update the two browser loaders that import them, and delete the two
orphaned files that no harness runs today.

Discovery-pattern correction (found during implementation): bare `node --test`
matches `*.test.ts`, `*-test.ts`, AND `*_test.ts`. The originally planned
`*.browser-test.ts` suffix ends in `-test` and is therefore still discovered
(it crashes on `HTMLElement is not defined`). The suffix must avoid the trailing
`-test`/`_test` too, so the convention is `*.browser.ts`, which node ignores.

Renames (the four files the browser actually loads):
- `src/dom/html.test.ts`              → `src/dom/html.browser.ts`
- `src/dom/fc.test.ts`                → `src/dom/fc.browser.ts`
- `src/dom/observable.test.ts`        → `src/dom/observable.browser.ts`
- `src/components/virtual_scroll.test.ts` → `src/components/virtual_scroll.browser.ts`

Loader updates (import paths only — these run only when `IsBrowser`, so the Node
runner never touches them):
- `src/dom/test.ts` — import `./html.browser.js`, `./fc.browser.js`,
  `./observable.browser.js`.
- `src/components/test.ts` — import `./virtual_scroll.browser.ts`.

Orphan deletions (decided by reading them, per the design's "Orphaned files"):
- `src/fs_win.test.ts` — **delete.** A 12-line manual `scandir` probe with no
  `describe`/`it` and no assertions; `node --test` would run it and emit stray
  stdout. Trivially reconstructable if a probe is ever wanted again. (Design
  default for this file is deletion.)
- `src/dom/form/form.test.ts` — **delete.** The file is 0 bytes. `dom/test.ts`
  never loaded it, so deleting it expands no coverage and removes nothing.

Runner unchanged this step: `npm test` is still `node ./src/test.mjs` (scope),
which stays green. `src/index.html` import list is unchanged (it imports
`test_all.js` for side effects plus the reporters/`execute` directly; the renames
are internal to the loaders). Manually confirm `src/index.html` still loads.

**End state:** scope runner green; browser harness green; four `*.browser.ts`
present, four `*.test.ts` originals and both orphans gone.

## Step 2: Switch the Node entrypoint to `node --test`

**Enables:** The TAP-reporter / `# fail 0` / `exit 0` assertion, the
`<testsuites>` JUnit root assertion (structure emitted even before real Node
cases exist — `<testcase>` follows in Step 3), the `test.mjs` deletion half of
the runner-removal assertion, and the exact-scripts / zero-dependencies
assertion.

`package.json` scripts:
- `"test": "node --test --test-reporter=tap"`
- `"ci": "node --test --test-reporter=junit"`

Reporter correction (found during implementation): Node 24's bare `node --test`
defaults to the **spec** reporter (`ℹ fail 0`), not TAP, even in a non-TTY
subprocess. The feature test's assertion 1 checks for `TAP version 13` /
`# fail 0`, so `--test-reporter=tap` is set explicitly on the `test` script.

Delete `src/test.mjs` (the `--mode`/`parseArgs` reporter selector is now the
built-in `--test-reporter` flag).

Reshape `src/test_all.ts` into the browser-only aggregator: drop the nine
`import "./<node>.test.ts"` side-effect lines (which `node --test` now discovers
directly) and keep only the browser path — the `dom`/`components` `loadTests()`
block, which now reaches the renamed `*.browser.ts` files via the Step 1
loaders. `src/index.html` still imports `test_all.js`, so leave that import in
place; verify it still drives the browser run.

At this boundary `node --test` discovers the nine Node `*.test.ts` files, which
still use `scope`. `scope`'s `describe`/`it` only *register* callbacks, so each
file presents **zero** `node:test` cases: `node --test` imports them cleanly,
reports `# fail 0`, and exits 0. Coverage is vacuous for the Node suite this one
step — Steps 3–4 restore it. (RGR check: confirm no Node `*.test.ts` file throws
at import/registration time under `node --test`; if one does, migrate that file
in this step.)

**End state:** `npm test` = `node --test`, green (0 real Node cases, 0 failures);
browser harness green via the reshaped `test_all.ts`; `test.mjs` gone.

## Step 3: Migrate the eight straight-matcher Node test files

**Enables:** Real `<testcase>` entries in the JUnit output and real passing TAP
cases — the bulk of the *"runs the Node suite on node:test and passes"*
assertion.

Rewrite these eight files from `scope` to `node:test` + `node:assert/strict`,
converting each matcher per the design's mapping table:

- `src/context.test.ts` (assertion calls only — leave the `using`/disposal
  semantics untouched; that is a separately tracked task)
- `src/diff.test.ts`
- `src/equal.test.ts`
- `src/generator.test.ts`
- `src/lock.test.ts`
- `src/result.test.ts`
- `src/observable/observable.test.ts`
- `src/server/main.test.ts`

Per file: replace `import { describe, expect, it } from "./scope/index.ts"` with
`import { describe, it } from "node:test"` and
`import assert from "node:assert/strict"`, then convert matchers:

| `scope`                         | `node:assert/strict`                       |
|---|---|
| `expect(a).toBe(b)`             | `assert.strictEqual(a, b)`                 |
| `expect(a).toEqual(b)`          | `assert.deepStrictEqual(a, b)`             |
| `expect(a).toEqual(b, true)`    | `assert.partialDeepStrictEqual(a, b)`      |
| `expect(a).toMatch(re)`         | `assert.match(a, re)` / `assert.ok(a.includes(s))` |
| `expect(a).toMatchObject(o)`    | `assert.partialDeepStrictEqual(a, o)`      |
| `expect(a).toBeNull()`          | `assert.strictEqual(a, null)`              |
| `expect(fn).toThrow(msg)`       | `assert.throws(fn, /msg/)`                 |
| `.not.toBe` / `.not.toEqual`    | `assert.notStrictEqual` / `assert.notDeepStrictEqual` |

Where a partial-match assertion's `partialDeepStrictEqual` semantics differ from
`scope`'s `equals(..., partial)`, convert that specific assertion explicitly
rather than trusting the table — verified per file in the red/green cycle.

`fs.test.ts` is deliberately excluded here; it carries the lone `cleanState` use
and gets its own step. Under `node --test` at this boundary the eight migrated
files run for real and `fs.test.ts` (still `scope`) presents zero cases.

**End state:** eight Node files green under `node:test`; `fs.test.ts` still on
`scope` (zero cases); `npm test` green.

## Step 4: Migrate `fs.test.ts` (inline `cleanState`)

**Enables:** The last Node file in the suite — completing
*"runs the Node suite on node:test and passes"* and producing the full
`<testcase>` set under `npm run ci`.

Rewrite `src/fs.test.ts` to `node:test` + `node:assert/strict` like the others,
and replace the single `cleanState(() => {...}, beforeEach)` call (`fs.test.ts:60`)
with the idiomatic pattern: a `let state` declared in the describe scope and
reassigned to a fresh value inside `beforeEach(...)`. Drop the
`import { cleanState } from "./scope/state.ts"` line. No helper is carried into
the Node suite.

**End state:** all nine Node files green under `node:test`; `npm run ci` emits a
JUnit document with real `<testcase>` entries; nothing in the Node suite imports
`scope` anymore.

## Step 5: Delete the dead Node-side `scope` pieces

**Enables:** The *"removes the Node `scope` runner while keeping the
browser-harness slice"* assertion — `test.mjs` (already gone, Step 2),
`scope/state.ts`, and `scope/fix.ts` deleted; `scope/expect.ts`,
`scope/execute.ts`, `scope/describe.ts`, and `scope/display/{dom,console,junit}.ts`
all still present.

Now that no caller remains:
- Delete `src/scope/state.ts` (`cleanState` — last caller removed in Step 4).
- Delete `src/scope/fix.ts` (zero callers, confirmed).
- Prune `src/scope/index.ts`: remove the `cleanState` and `fix` re-exports.
  Keep `describe`/`it`/`expect` (and the lifecycle hooks) — the browser
  aggregator `test_all.ts` still imports them for the in-page harness.

Confirm the kept browser slice is intact (`expect.ts`, `execute.ts`,
`describe.ts`, `display/dom.ts`, `display/console.ts`, `display/junit.ts`) and
that `src/index.html` still imports `execute`, `displayStatistics`, `onConsole`,
and `asXML` and renders the `status`/`json`/`xml` page-scrape blocks.

**End state:** the feature test `src/migrate_scope.feature.ts` passes in full.
Manual verification: open `src/index.html` in a browser and confirm the
DOM/component tests register, execute, and render pass/fail counts as before.
