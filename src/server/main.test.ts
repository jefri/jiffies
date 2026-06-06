import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import * as path from "node:path";
import * as process from "node:process";
import { describe, it } from "node:test";

// Feature test for: Remove `flags` module in favor of `node:util` `parseArgs`.
//
// User story (see docs/developer/2026-06-01-A-flags-parseargs/feature-test.md):
// An operator launches the server binary. Valid `--port` / `--host` flags bind
// the server to the supplied address; with no flags it binds 0.0.0.0:8080 as
// before. A malformed invocation (an unknown flag) is rejected up front instead
// of starting silently.
//
// This drives the real entrypoint as a subprocess and reads the "Server
// listening" log line the default logger emits as JSON on stdout.

const MAIN = path.join(import.meta.dirname, "main.ts");

interface RunResult {
  // Address from the "Server listening" log, e.g. "http://127.0.0.1:9091".
  listeningAddress?: string;
  // Exit code if the process exited on its own before listening.
  exitCode: number | null;
  // True if the process reached the listening state.
  listened: boolean;
  stdout: string;
  stderr: string;
}

function runServer(
  args: string[],
  { timeoutMs = 8000 } = {},
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [MAIN, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    // Holds the not-yet-newline-terminated tail between chunks so each
    // completed line is parsed exactly once.
    let pending = "";
    let listeningAddress: string | undefined;
    let listened = false;
    let settled = false;

    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
      resolve({
        ...(listeningAddress != null ? { listeningAddress } : {}),
        exitCode,
        listened,
        stdout,
        stderr,
      } satisfies RunResult);
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      pending += chunk;
      const lines = pending.split("\n");
      // Keep the trailing element: it is the partial line not yet terminated.
      pending = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const record = JSON.parse(line) as {
            message?: string;
            address?: string;
          };
          if (record?.message === "Server listening" && record.address) {
            listeningAddress = record.address;
            listened = true;
            // Server reached the listening state; stop it and report.
            finish(null);
          }
        } catch {
          // Non-JSON line; ignore.
        }
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("exit", (code) => finish(code));

    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}

describe("server entrypoint flag handling", () => {
  it("binds to the supplied --host and --port", async () => {
    const result = await runServer(["--port=9091", "--host=127.0.0.1"]);
    assert.strictEqual(result.listened, true);
    assert.strictEqual(result.listeningAddress, "http://127.0.0.1:9091");
  });

  it("binds 0.0.0.0:8080 when no flags are supplied", async () => {
    const result = await runServer([]);
    assert.strictEqual(result.listened, true);
    assert.strictEqual(result.listeningAddress, "http://0.0.0.0:8080");
  });

  it("rejects a malformed invocation instead of starting", async () => {
    const result = await runServer(["--bogus"]);
    assert.strictEqual(result.listened, false);
    assert.strictEqual(result.listeningAddress, undefined);
    assert.notStrictEqual(result.exitCode, 0);
  });
});
