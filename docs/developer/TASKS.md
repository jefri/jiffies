# Node Modernization Tasks

- **Final refactor + review for `remove-scope`.**
  - After the `2026-06-01-B-remove-scope` inner loop is green (feature test
    `src/migrate_scope.feature.ts` passes), do a finishing pass: run
    `general:review`, tidy with `developer:refactor`, and confirm the feature
    file's `*.feature.ts` exclusion and the manual `src/index.html` browser
    check still hold. Then `developer:cleanup` the topic.
    During cleanup, also remove the migrate_scope.feature.ts scaffold.

- **Fix the malformed `ci` script in `package.json`.**
  - `"ci": "npm run node ./src/test.mjs --mode=junit"` is not a valid script
    invocation (`npm run node` runs no such script), so the junit/CI reporter
    path is never exercised. Pre-existing, surfaced during the flags→parseArgs
    review. Likely intended `node ./src/test.mjs --mode=junit`.

- **`context.ts` → native `using` / `await using`.**
  - Safety net exists: `src/context.test.ts`.
  - Red: add a test asserting `Symbol.dispose` / `Symbol.asyncDispose` teardown
    order and that disposal still runs on throw.
  - Green: provide a path built on `Symbol.dispose`; keep the existing
    `using()` wrapper as a deprecated alias until callers migrate.
  - Refactor: remove the two `@ts-expect-error` casts in the error path.
  - Note: needs TS 5.2 lib + the disposal polyfill or Node 24 runtime. Verify
    before starting; do not skip the check.

- **Enable `noUncheckedIndexedAccess`.**
  - Red: flip the flag; the compiler errors ARE the failing test.
  - Green: add `?? default` guards at each site (MIME lookup, flags maps,
    `findSource()` `atLines[2]` in `log.ts:72`). One file per commit.
  - Done when: `npm run check:lint` is clean with the flag on.

- **`satisfies` for literal tables.**
  - Targets: `MIME_TYPES` (response.ts), `LEVELS` / `LEVEL` (log.ts).
  - Red: a type-level test (or compile check) asserting key literals survive.
  - Green: replace `: Record<string,string>` annotations with
    `satisfies Record<string,string>`.


- **Remove the per-request `console.log` in `static.ts:18`.**
  - > `src/server` has zero tests. first a characterization test for the current handler, then the change.
  - Red: write the first `static.ts` handler test; assert it does not write to
    stdout on a normal request (will fail — it logs today).
  - Green: delete the line.

- **`sitemap.ts` directory walk → `fs.glob`.**
  - > `src/server` has zero tests. first a characterization test for the current handler, then the change.
  - Red: characterization test feeding a fixture tree, asserting the exact
    sitemap array (including the `node_modules` and dotfile exclusions).
  - Green: replace the recursive `findSiteMap` with `glob("**/index.html")`,
    preserving the exclusions and the web-separator normalization.
  - Refactor: delete `findSiteMap`.

- **Confirm the ts-blank-space boundary.**
  - > `src/server` has zero tests. first a characterization test for the current handler, then the change.
  - Red: a test proving `tsFileServer` still strips types for browser delivery.
  - Green/decision: keep `ts-blank-space` ONLY for browser-facing transpile;
    document that the server itself runs on native Node stripping. No code
    change if the boundary already holds — just the test and a note.

## Tier 4 — DOM reentrancy correctness


- **Event handlers stack on `.update()`.**
  - > Latent defects in the reentrant `update` path, found while documenting the DOM for consumers.
    > Documentation (`src/dom/SKILL.md`) describes current behavior; these tasks fix it.
  - Safety net exists: `src/dom/html.test.ts` (add-once / remove-once only).
  - Red: add a test that updates the same event twice with different handlers, then
    dispatches once; assert the handler fires the expected number of times (today the old
    listener is never removed, so it stacks). See `dom.ts:99-111`.
  - Green: before `addEventListener`, remove any previously tracked listener for that key
    so an update replaces rather than appends.
  - Refactor: confirm `{ click: null }` still removes, and the `Events` map stays accurate.

- **Dead namespace branch in `update`.**
  - > Latent defects in the reentrant `update` path, found while documenting the DOM for consumers.
    > Documentation (`src/dom/SKILL.md`) describes current behavior; these tasks fix it.
  - Red: a test creating a namespaced element (or SVG) and asserting the intended
    `setAttributeNS` path; today it is unreachable because `useNamespace` is hardcoded
    `false` and the assigning expression is computed and discarded (`dom.ts:148-152`).
  - Green/decision: either wire `useNamespace` to the intended expression, or delete the
    dead branch if `setAttribute` is sufficient for SVG. Decide with a test that pins the
    SVG attribute behavior either way.
  - Note: confirm whether any current SVG usage depends on namespaced attributes before
    choosing. Do not skip the check.


- **Update `src/dom/SKILL.md`**
  - > Latent defects in the reentrant `update` path, found while documenting the DOM for consumers.
    > Documentation (`src/dom/SKILL.md`) describes current behavior; these tasks fix it.

## Out of scope (no native replacement today)

- MIME utility — Node ships none; the hand-map in `response.ts` stays.
- Static file serving — no built-in handler; the middleware design stays.
- Replacing the `scope` test framework with `node:test` — large, separate
  initiative. Tracked here only as a known overlap, not a task.
