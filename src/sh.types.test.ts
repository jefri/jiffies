import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  type Completed,
  type CompletedWithCapture,
  clone,
  type RunOptions,
  RunWithCapture,
  type Settings,
  Sh,
  TrueRunner,
} from "./sh.ts";

// Compile-only checks: calling this would deliberately access unavailable output.
export function captureTypeChecks(
  capture: boolean,
  settings: Partial<Settings>,
  options: RunOptions,
) {
  const captured = Sh("tool", { runner: TrueRunner })();
  captured.stdout satisfies Promise<string>;
  captured.stderr satisfies Promise<string>;
  captured.completed satisfies Promise<CompletedWithCapture>;
  Promise.resolve(captured) satisfies Promise<string>;

  const quietShell = Sh("tool", { runner: TrueRunner, capture: false });
  const quiet = quietShell.remote.$({ verbose: true }).status();
  quiet.returncode satisfies Promise<number>;
  quiet.completed satisfies Promise<Completed>;
  Promise.resolve(quiet) satisfies Promise<Completed>;
  quiet.catch(() => 1) satisfies Promise<Completed | number>;
  quiet.finally(() => {}) satisfies Promise<Completed>;
  // @ts-expect-error Noncapturing runs do not expose stdout.
  quiet.stdout;
  // @ts-expect-error Noncapturing runs do not expose stderr.
  quiet.stderr;
  // @ts-expect-error Awaiting a noncapturing run does not return output.
  Promise.resolve(quiet) satisfies Promise<string>;
  // @ts-expect-error Noncapturing completion records do not contain output.
  quiet.completed satisfies Promise<CompletedWithCapture>;

  const disabled = captured.with({ capture: false }).with({ cwd: "." });
  // @ts-expect-error Unrelated settings preserve disabled capture.
  disabled.stdout;
  disabled.with({ capture: true }).stdout satisfies Promise<string>;
  clone(quietShell, { capture: true })().stdout satisfies Promise<string>;
  clone(Sh("tool"), {})().stdout satisfies Promise<string>;
  Promise.resolve(clone(quietShell, {})()) satisfies Promise<Completed>;
  // @ts-expect-error Cloning preserves disabled capture unless overridden.
  clone(quietShell, { cwd: "." })().stdout;

  captured.pipe(captured).stdout satisfies Promise<string>;
  quiet.with({ capture: true }).pipe(captured).stdout satisfies Promise<string>;
  captured.pipe(quiet).returncode satisfies Promise<number>;
  Promise.resolve(captured.pipe(quiet)) satisfies Promise<Completed>;
  // @ts-expect-error A noncapturing source has no stdout to pipe.
  quiet.pipe(captured);
  // @ts-expect-error Disabling capture removes the ability to pipe stdout.
  disabled.pipe(captured);
  // @ts-expect-error A noncapturing pipeline result cannot feed another command.
  captured.pipe(quiet).pipe(captured);
  // @ts-expect-error The target determines whether a pipeline captures output.
  captured.pipe(quiet).stdout;

  const dynamic = Sh("tool", { capture })();
  Promise.resolve(dynamic) satisfies Promise<string | Completed>;
  if (dynamic instanceof RunWithCapture) {
    dynamic.stdout satisfies Promise<string>;
    dynamic.stderr satisfies Promise<string>;
    dynamic.pipe(captured).stdout satisfies Promise<string>;
  }
  dynamic.completed.then((completed) => {
    completed.returncode satisfies number;
    if ("stdout" in completed) completed.stdout satisfies string;
  });
  // @ts-expect-error A dynamic boolean does not guarantee captured output.
  dynamic.stdout;
  // @ts-expect-error Piping requires capture to be known to be enabled.
  dynamic.pipe(captured);
  // @ts-expect-error Optional capture settings do not guarantee output.
  Sh("tool", settings)().stdout;
  // @ts-expect-error Optional run settings do not guarantee output.
  captured.with(options).stdout;
}

it("preserves capture contracts in emitted declarations", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const compiler = join(root, "node_modules/typescript/bin/tsc");
  const directory = mkdtempSync(join(tmpdir(), "jiffies-sh-types-"));
  const fixture = join(directory, "sh.types.test.ts");
  const source = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const check = (...args: string[]) => {
    const result = spawnSync(process.execPath, [compiler, ...args], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };

  try {
    check("-p", "tsconfig.build.json", "--outDir", directory);
    writeFileSync(fixture, source.replace('from "./sh.ts"', 'from "./sh.js"'));
    check(
      fixture,
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target",
      "ESNext",
      "--module",
      "ESNext",
      "--moduleResolution",
      "bundler",
      "--typeRoots",
      join(root, "node_modules/@types"),
      "--types",
      "node",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
