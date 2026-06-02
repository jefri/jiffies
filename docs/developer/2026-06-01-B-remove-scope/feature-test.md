# Feature Test: Remove the in-house `scope` test framework

## User Story

A developer working on `jiffies` runs the project's test commands and gets the
platform test runner, not the in-house `scope` runner.

**Given** the `jiffies` repo on Node 24 (engines `>=22.18.0`)
**When** the developer runs `npm test`
**Then** the Node test suite runs on `node:test`, every Node test passes, exit
is `0`, and the browser-only DOM/component tests are *not* picked up (no
`HTMLElement is not defined` errors).

**And when** the developer runs `npm run ci`
**Then** well-formed JUnit XML is emitted by Node's built-in reporter.

**And** the Node-side `scope` runner (`test.mjs`, `state.ts`, `fix.ts`) is gone,
while the browser-harness slice of `scope` (`expect`, `describe`/`execute`, the
three reporters) survives so `src/index.html` keeps running the DOM tests.

**And** no new dependencies were added; the `test`/`ci` scripts point at
`node --test`.

## Executable Feature Test

- File: [src/migrate_scope.feature.ts](../../../src/migrate_scope.feature.ts)
- Framework: `node:test` + `node:assert/strict` (the migration target).

### How to run it

It is deliberately named `*.feature.ts`, **not** `*.test.ts`, so `node --test`
default discovery ignores it. That avoids infinite recursion: the test spawns
`npm test` (= `node --test`) as a subprocess, and a discoverable feature file
would re-discover itself. Run it explicitly:

```sh
node --test src/migrate_scope.feature.ts
```

Expected today: **fails** (red). `npm test` still runs `node ./src/test.mjs`
(the `scope` runner), `npm run ci` is the malformed `npm run node ...`
invocation, the browser tests still match `*.test.ts`, and the `scope` Node
runner files still exist.

### What it asserts (maps to design Metrics / Verification)

1. `npm test` → `node:test` TAP output, `# fail 0`, exit `0`.
2. `npm test` does not error on the browser tests; the four browser test files
   are renamed to the `*.browser.ts` convention and the `*.test.ts`
   versions are gone.
3. `npm run ci` emits a well-formed `<testsuites>`/`<testcase>` JUnit document.
4. The Node runner (`test.mjs`, `scope/state.ts`, `scope/fix.ts`) is deleted;
   the browser slice (`scope/expect.ts`, `scope/execute.ts`, `scope/describe.ts`,
   `scope/display/{dom,console,junit}.ts`) is kept.
5. Zero test-framework dependencies added; `test` =
   `node --test --test-reporter=tap` (the `=tap` is explicit because Node 24's
   bare `node --test` defaults to the spec reporter, and assertion 1 checks for
   TAP), `ci` = `node --test --test-reporter=junit`.

### Deliberately out of this test

- The two orphaned files (`fs_win.test.ts`, `dom/form/form.test.ts`) — their
  resolution is decided during planning per the design's "Orphaned files"
  section, so the feature test does not pin them.
- The manual browser verification (open `src/index.html`, confirm DOM tests
  render). The design lists this as a manual step; it is not automatable here.
