// Feature test for "Remove the in-house `scope` test framework".
//
// User story: a developer on jiffies runs the project's test commands and gets
// the platform test runner, not the in-house `scope` runner. `npm test` runs
// the Node suite on `node:test`; the browser-only DOM tests are not picked up;
// `npm run ci` emits well-formed JUnit XML; the Node-side `scope` runner is
// gone while the browser-harness slice survives; and no dependencies were added.
//
// This file is named `*.feature.ts`, NOT `*.test.ts`, on purpose: `node --test`
// default discovery matches `*.test.ts`, so this file is invisible to it. That
// matters because the test below spawns `npm test` (= `node --test`) as a
// subprocess. If this file were discovered, that spawn would re-discover this
// file and recurse forever. Run it explicitly:
//
//     node --test src/migrate_scope.feature.ts
//
// It is expected to FAIL until the migration is implemented.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");

function run(script: string): { status: number; output: string } {
  // This file is run via `node --test`, which sets NODE_TEST_CONTEXT in the
  // environment. If the spawned `npm test` (= node --test) inherits it, the
  // child detects a nested test run and switches to the internal child-reporter
  // protocol, ignoring --test-reporter (no TAP, no JUnit). Strip it so the
  // subprocess behaves like a real top-level invocation.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  try {
    const output = execFileSync("npm", ["run", "--silent", script], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });
    return { status: 0, output };
  } catch (e) {
    // execFileSync throws on non-zero exit; capture the streams it collected.
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return {
      status: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

function readPackageJson(): {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  return JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
}

describe("removing the in-house `scope` test framework", () => {
  it("`npm test` runs the Node suite on node:test and passes", () => {
    const { status, output } = run("test");

    // node:test's reporter (TAP in a non-TTY subprocess) — proves the platform
    // runner ran, not scope's `onConsole` reporter.
    assert.match(
      output,
      /TAP version 13/,
      "expected the node:test TAP reporter",
    );
    assert.match(output, /^# fail 0$/m, "expected zero failing Node tests");
    assert.equal(
      status,
      0,
      "`npm test` must exit 0 when the Node suite passes",
    );
  });

  it("does not run the browser-only DOM/component tests", () => {
    const { output } = run("test");

    // Today these error under `node --test` because `HTMLElement` is undefined
    // in Node and `scope`'s describe/it are not node:test registrations.
    assert.doesNotMatch(
      output,
      /HTMLElement is not defined/,
      "browser tests must be excluded from `node --test` discovery",
    );

    // The exclusion mechanism: browser tests live off every `node --test`
    // discovery pattern. node matches `*.test.ts`, `*-test.ts`, AND `*_test.ts`,
    // so the suffix must avoid the trailing `-test` too — hence `.browser.ts`.
    const renamed = [
      "src/dom/html.browser.ts",
      "src/dom/fc.browser.ts",
      "src/dom/observable.browser.ts",
      "src/components/virtual_scroll.browser.ts",
    ];
    for (const f of renamed) {
      assert.ok(existsSync(path.join(repoRoot, f)), `expected ${f} to exist`);
    }
    const removed = [
      "src/dom/html.test.ts",
      "src/dom/fc.test.ts",
      "src/dom/observable.test.ts",
      "src/components/virtual_scroll.test.ts",
    ];
    for (const f of removed) {
      assert.ok(
        !existsSync(path.join(repoRoot, f)),
        `${f} must be renamed off the *.test.ts discovery pattern`,
      );
    }
  });

  it("`npm run ci` emits well-formed JUnit XML via the built-in reporter", () => {
    const { output } = run("ci");

    assert.match(output, /<testsuites\b/, "expected a JUnit <testsuites> root");
    assert.match(output, /<\/testsuites>/, "expected a closed <testsuites>");
    assert.match(output, /<testcase\b/, "expected at least one <testcase>");
  });

  it("removes the Node `scope` runner while keeping the browser-harness slice", () => {
    const gone = ["src/test.mjs", "src/scope/state.ts", "src/scope/fix.ts"];
    for (const f of gone) {
      assert.ok(
        !existsSync(path.join(repoRoot, f)),
        `${f} must be deleted with the Node runner`,
      );
    }

    const kept = [
      "src/scope/expect.ts",
      "src/scope/execute.ts",
      "src/scope/describe.ts",
      "src/scope/display/dom.ts",
      "src/scope/display/console.ts",
      "src/scope/display/junit.ts",
    ];
    for (const f of kept) {
      assert.ok(
        existsSync(path.join(repoRoot, f)),
        `${f} must survive for the browser harness`,
      );
    }
  });

  it("adds zero dependencies and points the scripts at node --test", () => {
    const pkg = readPackageJson();

    // Node 24's bare `node --test` defaults to the spec reporter, so `--test-
    // reporter=tap` is set explicitly to get the TAP output assertion 1 checks.
    assert.equal(pkg.scripts.test, "node --test --test-reporter=tap");
    assert.equal(pkg.scripts.ci, "node --test --test-reporter=junit");

    const forbidden = [
      "vitest",
      "jest",
      "mocha",
      "ava",
      "tap",
      "@jest/globals",
    ];
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const dep of forbidden) {
      assert.ok(
        !(dep in all),
        `no test framework dependency may be added (${dep})`,
      );
    }
  });
});
