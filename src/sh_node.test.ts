import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import { type RunRequest, Sh } from "./sh.ts";
import { nodeRunner } from "./sh_node.ts";

function request(script: string): RunRequest<true> {
  return { args: [process.execPath, "-e", script], capture: true, cwd: "." };
}

describe("Node runner", () => {
  it("resolves an executable through PATH", async () => {
    const completed = await nodeRunner({
      args: ["node", "-p", "'found'"],
      capture: true,
      cwd: ".",
    });

    assert.equal(completed.stdout, "found\n");
    assert.equal(completed.returncode, 0);
  });

  it("captures both streams and supplies stdin in the requested working directory", async () => {
    const cwd = realpathSync(tmpdir());
    const input = "hello ☃\n";

    const completed = await nodeRunner({
      ...request(
        "console.log(process.cwd()); console.error('err'); process.stdin.pipe(process.stdout)",
      ),
      cwd,
      input,
    });

    assert.equal(completed.stdout, `${cwd}\n${input}`);
    assert.equal(completed.stderr, "err\n");
    assert.equal(completed.returncode, 0);
  });

  it("reports nonzero exits as data without applying Run's checking policy", async () => {
    const completed = await nodeRunner({
      ...request("console.log('before exit'); process.exitCode = 7"),
      timeout: 5,
    });

    assert.equal(completed.returncode, 7);
    assert.equal(completed.stdout, "before exit\n");
  });

  it("reports signal termination as a negative exit code", async () => {
    const completed = await nodeRunner(
      request("process.kill(process.pid, 'SIGKILL')"),
    );

    assert.equal(completed.returncode, -9);
  });

  it("inherits both streams and omits output fields when capture is disabled", () => {
    const script = `
      import assert from 'node:assert/strict';
      import { nodeRunner } from ${JSON.stringify(new URL("./sh_node.ts", import.meta.url).href)};
      const args = [process.execPath, '-e', "process.stdout.write('out'); process.stderr.write('err')"];
      const completed = await nodeRunner({ args, capture: false, cwd: '.' });
      assert.deepEqual(completed, { args, returncode: 0 });
    `;

    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { encoding: "utf8", timeout: 5000 },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "out");
    assert.equal(result.stderr, "err");
  });

  it("tolerates a child exiting before reading all stdin", async () => {
    const completed = await nodeRunner({
      ...request("process.exit(0)"),
      input: "x".repeat(1024 * 1024),
    });

    assert.equal(completed.returncode, 0);
  });

  it("kills a command that ignores SIGTERM and preserves partial output", async () => {
    const run = nodeRunner({
      ...request(
        "process.on('SIGTERM', () => {}); console.log('ready'); console.error('partial'); setTimeout(() => { console.log('finished'); process.exit(0) }, 3000)",
      ),
      timeout: 1,
    });

    await assert.rejects(run, {
      name: "CommandTimeout",
      timeout: 1,
      stdout: "ready\n",
      stderr: "partial\n",
    });
  });

  it("rejects an empty command before spawning", async () => {
    await assert.rejects(
      nodeRunner({ args: [], capture: true, cwd: "." }),
      TypeError,
    );
  });

  it("propagates a spawn error for a missing executable", async () => {
    await assert.rejects(
      nodeRunner({
        args: ["definitely-not-a-command-xyz"],
        capture: true,
        cwd: ".",
      }),
      { code: "ENOENT" },
    );
  });

  it("loads the default Node adapter through Sh", async () => {
    const output = await Sh(process.execPath)("-p", "'default runner'");

    assert.equal(output, "default runner\n");
  });
});
