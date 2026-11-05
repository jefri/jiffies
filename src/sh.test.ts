import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  argsOf,
  CommandFailed,
  CommandTimeout,
  clone,
  FalseRunner,
  git,
  makeRunner,
  type Output,
  quote,
  type Runner,
  type RunRequest,
  renderFlags,
  Sh,
  settingsOf,
  sh,
  TrueRunner,
  withExitCode,
} from "./sh.ts";

const echo = makeRunner((args) => ({ stdout: args.join("\n"), stderr: "" }));
const cat = makeRunner((_args, _cwd, input) => ({ stdout: input ?? "" }));

/** A fake shell that records each request it receives. */
function recording(output: Output = { stdout: "out", stderr: "err" }) {
  const calls: RunRequest[] = [];
  const runner: Runner = (request) => {
    calls.push(request);
    return {
      args: request.args,
      returncode: output.returncode ?? 0,
      stdout: output.stdout ?? "",
      stderr: output.stderr ?? "",
    };
  };
  return { calls, runner };
}

describe("flags", () => {
  const cases: [string, Parameters<typeof renderFlags>[0], string[]][] = [
    ["value", { name: "x" }, ["--name=x"]],
    ["true", { detach: true }, ["--detach"]],
    ["false and null", { detach: false, network: null }, []],
    ["undefined", { network: undefined }, []],
    ["underscore", { dry_run: true }, ["--dry-run"]],
    ["short switch", { v: true }, ["-v"]],
    ["short value", { m: "a message" }, ["-m", "a message"]],
    ["array", { label: ["a=1", "b=2"] }, ["--label=a=1", "--label=b=2"]],
    ["record", { env: { A: "1", B: 2 } }, ["--env=A=1", "--env=B=2"]],
    ["short record", { e: { A: "1" } }, ["-e", "A=1"]],
    ["number", { port: 5432 }, ["--port=5432"]],
  ];
  for (const [name, flags, rendered] of cases) {
    it(`renders ${name}`, () => assert.deepEqual(renderFlags(flags), rendered));
  }

  it("quotes like shlex", () => {
    assert.equal(quote("plain/path-1.txt"), "plain/path-1.txt");
    assert.equal(quote("some value"), "'some value'");
    assert.equal(quote(""), "''");
    assert.equal(quote("it's"), `'it'"'"'s'`);
  });
});

describe("building commands", () => {
  const fake = (...command: string[]) => Sh(command, { runner: TrueRunner });

  it("appends segments by property and bracket access", () => {
    assert.deepEqual(argsOf(fake("tool").remote["show-all"]), [
      "tool",
      "remote",
      "show-all",
    ]);
    assert.deepEqual(argsOf(sh), []);
    assert.deepEqual(argsOf(git), ["git"]);
  });

  it("renders options objects at their position in a call", async () => {
    const run = fake("tool")("arg", { dry_run: true, tag: ["a", "b"] }, "last");
    assert.deepEqual(run.args, [
      "tool",
      "arg",
      "--dry-run",
      "--tag=a",
      "--tag=b",
      "last",
    ]);
    assert.equal(
      fake("tool").remote["show-all"]("some value", { verbose: "yes" }).command,
      "tool remote show-all 'some value' --verbose=yes",
    );
  });

  it("calls an empty shell as a command", () => {
    assert.deepEqual(Sh(undefined, { runner: TrueRunner })("ls", 5).args, [
      "ls",
      "5",
    ]);
  });

  it("places options mid-command with $ and returns a shell, not a run", () => {
    const docker = fake("docker");
    assert.deepEqual(
      docker.run.$({ detach: true, name: "db" })(
        "postgres:16",
        "--",
        "-c",
        "fsync=off",
      ).args,
      [
        "docker",
        "run",
        "--detach",
        "--name=db",
        "postgres:16",
        "--",
        "-c",
        "fsync=off",
      ],
    );
    assert.deepEqual(
      fake("git").$({ C: "/repo" }).commit.$({ m: "msg", amend: true })().args,
      ["git", "-C", "/repo", "commit", "-m", "msg", "--amend"],
    );
    assert.deepEqual(argsOf(fake("aws").s3.cp.$({ region: "us-east-1" })), [
      "aws",
      "s3",
      "cp",
      "--region=us-east-1",
    ]);
    assert.deepEqual(argsOf(fake("git").$("cherry-pick", 3)), [
      "git",
      "cherry-pick",
      "3",
    ]);
  });

  it("is not thenable and is safe to await or serialize", async () => {
    const shell = fake("tool");
    assert.equal(await shell, shell);
    assert.equal(JSON.stringify({ shell }), "{}");
  });

  it("rejects non-shells", () => {
    assert.throws(() => argsOf({} as never), TypeError);
  });
});

describe("running", () => {
  it("is lazy, runs once, and caches", async () => {
    const { calls, runner } = recording();
    const run = Sh("tool", { runner, check: false, capture: false })(
      "some value",
    ).with({ cwd: "/tmp", capture: true });
    assert.deepEqual(calls, []);
    assert.equal(await run.stdout, "out");
    assert.equal(await run.stderr, "err");
    assert.equal(await run.returncode, 0);
    assert.equal(await run, "out");
    assert.deepEqual(calls, [
      { args: ["tool", "some value"], capture: true, cwd: "/tmp" },
    ]);
  });

  it("runs a fake shell", async () => {
    const run = Sh(["echo"], { runner: echo })("Hello");
    assert.equal(await run.returncode, 0);
    assert.equal(await run, "echo\nHello");
  });

  it("pipes stdout to the next command's stdin", async () => {
    const run = Sh("echo", { runner: echo })("Hello", "world").pipe(
      Sh("cat", { runner: cat })(),
    );
    assert.equal(await run, "echo\nHello\nworld");
    assert.equal(await run.returncode, 0);
  });

  it("pipes from a command that does not capture", async () => {
    const run = Sh("echo", { runner: echo, capture: false })("hi").pipe(
      Sh("cat", { runner: cat })(),
    );
    assert.equal(await run, "echo\nhi");
  });

  it("does not run a pipe's target when the source fails", async () => {
    const { calls, runner } = recording();
    const run = Sh("false", { runner: FalseRunner })().pipe(
      Sh("next", { runner })(),
    );
    await assert.rejects(run.stdout, CommandFailed);
    assert.deepEqual(calls, []);
  });

  it("feeds input to stdin", async () => {
    const seen: (string | undefined)[] = [];
    const runner = makeRunner((_args, _cwd, input) => {
      seen.push(input);
      return { stdout: input ?? "" };
    });
    assert.equal(await Sh("cat", { runner })().with({ input: "x" }), "x");
    assert.deepEqual(seen, ["x"]);
  });

  it("passes the timeout only when one is set", async () => {
    const { calls, runner } = recording();
    await Sh("tool", { runner })();
    await Sh("tool", { runner, timeout: 4 })();
    await Sh("tool", { runner })().with({ timeout: 5 });
    await Sh("tool", { runner, timeout: 30 })().with({ timeout: 6 });
    assert.deepEqual(
      calls.map((call) => call.timeout),
      [undefined, 4, 5, 6],
    );
    assert.ok(!("timeout" in (calls[0] ?? {})));
  });
});

describe("check", () => {
  const cases: [boolean, boolean | undefined, boolean][] = [
    [true, undefined, true],
    [true, false, false],
    [false, undefined, false],
    [false, true, true],
  ];
  for (const [setting, override, raises] of cases) {
    it(`check=${setting} with override ${override} ${raises ? "rejects" : "returns the code"}`, async () => {
      const failing = Sh("tool", {
        runner: withExitCode(7),
        check: setting,
      })().with(override === undefined ? {} : { check: override });
      if (raises) {
        await assert.rejects(failing.returncode, (error: CommandFailed) => {
          assert.ok(error instanceof CommandFailed);
          assert.equal(error.returncode, 7);
          assert.equal(error.command, "tool");
          return true;
        });
      } else {
        assert.equal(await failing.returncode, 7);
      }
    });
  }

  it("carries output on the error", async () => {
    const run = Sh("tool", {
      runner: makeRunner(() => ({ returncode: 3, stdout: "o", stderr: "e" })),
    })();
    await assert.rejects(run.stdout, {
      name: "CommandFailed",
      stdout: "o",
      stderr: "e",
    });
  });

  it("applies capture to fake runners", async () => {
    const runner = makeRunner(() => ({
      returncode: 3,
      stdout: "out",
      stderr: "err",
    }));
    const quiet = await Sh("test", { runner, check: false, capture: false })()
      .completed;
    assert.deepEqual(
      [quiet.stdout, quiet.stderr, quiet.returncode],
      ["", "", 3],
    );
    const loud = await Sh("test", { runner, check: false })().completed;
    assert.deepEqual([loud.stdout, loud.stderr], ["out", "err"]);
  });

  it("built-in runners return their exit codes", async () => {
    for (const [runner, code] of [
      [TrueRunner, 0],
      [FalseRunner, 1],
      [withExitCode(9), 9],
    ] as const) {
      assert.equal(
        await Sh(undefined, { runner, check: false })().returncode,
        code,
      );
    }
  });
});

describe("checkReturncode", () => {
  function recordingLogger() {
    const events: [unknown, unknown][] = [];
    return {
      events,
      logger: {
        warn: (message: unknown, data?: unknown) =>
          events.push([message, data]),
      },
    };
  }
  const failing = (cwd?: string) =>
    Sh("tool", {
      runner: makeRunner(() => ({
        returncode: 5,
        stdout: "out",
        stderr: "err",
      })),
      ...(cwd === undefined ? {} : { cwd }),
    })("arg");

  for (const reraise of [true, false]) {
    for (const event of [undefined, "command failed"]) {
      it(`logs a failure (reraise=${reraise}, event=${event})`, async () => {
        const { events, logger } = recordingLogger();
        const run = failing("/work");
        const outcome = run.checkReturncode({
          logger,
          reraise,
          ...(event === undefined ? {} : { event }),
        });
        if (reraise) {
          await assert.rejects(outcome, {
            name: "CommandFailed",
            returncode: 5,
          });
        } else {
          assert.equal(await outcome, undefined);
        }
        assert.deepEqual(events, [
          [
            event ?? "tool arg",
            { cwd: "/work", command: "tool arg", stdout: "out", stderr: "err" },
          ],
        ]);
      });
    }
  }

  it("returns the result and logs nothing on success", async () => {
    const { events, logger } = recordingLogger();
    const completed = await Sh(undefined, {
      runner: TrueRunner,
    })().checkReturncode({ logger });
    assert.equal(completed?.returncode, 0);
    assert.deepEqual(events, []);
  });

  it("logs a timeout with null output, without rerunning", async () => {
    const { events, logger } = recordingLogger();
    let calls = 0;
    const run = Sh("tool", {
      timeout: 1,
      runner: () => {
        calls++;
        throw new CommandTimeout(["tool"], 1, {});
      },
    })("arg");
    await assert.rejects(run.checkReturncode({ logger }), CommandTimeout);
    assert.equal(calls, 1);
    assert.deepEqual(events[0]?.[1], {
      cwd: ".",
      command: "tool arg",
      stdout: null,
      stderr: null,
    });
  });

  it("does not cache a timeout", async () => {
    let calls = 0;
    const run = Sh("tool", {
      runner: () => {
        calls++;
        throw new CommandTimeout(["tool"], 1, {});
      },
    })();
    await assert.rejects(run.stdout, CommandTimeout);
    await assert.rejects(run.stdout, CommandTimeout);
    assert.equal(calls, 2);
  });
});

describe("settings", () => {
  it("logs the quoted command when the run is created", () => {
    const messages: unknown[] = [];
    const logger = {
      info: (message: unknown) => messages.push(message),
      warn() {},
    };
    const run = Sh("tool", { log: true, logger, runner: TrueRunner })(
      "some value",
    );
    assert.deepEqual(messages, ["tool 'some value'"]);
    assert.equal(run.command, "tool 'some value'");
    Sh("tool", { logger, runner: TrueRunner })("quiet");
    assert.equal(messages.length, 1);
  });

  it("clone keeps arguments and replaces settings, including with false", () => {
    const original = Sh("tool", {
      check: false,
      runner: TrueRunner,
      log: true,
    });
    const same = clone(original, {});
    assert.notEqual(same, original);
    assert.deepEqual(settingsOf(same), settingsOf(original));
    const changed = clone(original, {
      check: true,
      log: false,
      cwd: "/x",
      runner: FalseRunner,
      timeout: 9,
    });
    assert.deepEqual(argsOf(changed), ["tool"]);
    assert.equal(settingsOf(changed).check, true);
    assert.equal(settingsOf(changed).log, false);
    assert.equal(settingsOf(changed).cwd, "/x");
    assert.equal(settingsOf(changed).runner, FalseRunner);
    assert.equal(settingsOf(changed).timeout, 9);
    assert.equal(settingsOf(original).check, false);
    assert.equal(settingsOf(original).timeout, undefined);
    assert.equal(settingsOf(clone(changed, { timeout: undefined })).timeout, 9);
  });

  it("segments inherit settings", () => {
    const nested = Sh("tool", { timeout: 3, check: false }).remote["show-all"];
    assert.equal(settingsOf(nested).timeout, 3);
    assert.equal(settingsOf(nested).check, false);
    assert.equal(nested().args.length, 3);
  });

  it("has defaults", () => {
    const defaults = settingsOf(Sh());
    assert.equal(defaults.check, true);
    assert.equal(defaults.capture, true);
    assert.equal(defaults.cwd, ".");
    assert.equal(defaults.log, false);
    assert.equal(defaults.runner, undefined);
    assert.equal(defaults.timeout, undefined);
  });
});

describe("runner factory", () => {
  it("loads lazily, once, and shares the runner across shells", async () => {
    let loads = 0;
    const factory = async () => {
      loads++;
      return echo;
    };
    const base = Sh("echo", { factory });
    assert.equal(loads, 0);
    const first = base("a");
    const second = base.sub("b");
    assert.equal(loads, 0);
    assert.equal(await first, "echo\na");
    assert.equal(await second, "echo\nsub\nb");
    assert.equal(loads, 1);
  });

  it("prefers a runner given directly", async () => {
    const factory = () => {
      throw new Error("factory should not run");
    };
    assert.equal(await Sh("echo", { runner: echo, factory })("x"), "echo\nx");
  });

  it("retries after a failed load", async () => {
    let loads = 0;
    const factory = () => {
      loads++;
      if (loads === 1) throw new Error("not yet");
      return echo;
    };
    const shell = Sh("echo", { factory });
    await assert.rejects(shell("a").stdout, /not yet/);
    assert.equal(await shell("a"), "echo\na");
    assert.equal(loads, 2);
  });
});

describe("real subprocesses", () => {
  const node = Sh(process.execPath);

  it("runs a command found on the path", async () => {
    const which = await sh["/usr/bin/env"].which("which");
    assert.ok(which.trim().endsWith("/bin/which"));
  });

  it("captures stdout, stderr, and the working directory", async () => {
    const cwd = process.cwd();
    const run = node(
      "-e",
      "console.log(process.cwd()); console.error('error')",
    ).with({ cwd });
    assert.equal((await run).trim(), cwd);
    assert.equal(await run.stderr, "error\n");
    assert.equal(await run.returncode, 0);
  });

  it("rejects on a nonzero exit unless check is off", async () => {
    const run = node("-e", "process.exit(7)");
    await assert.rejects(run.stdout, { name: "CommandFailed", returncode: 7 });
    assert.equal(await run.with({ check: false }).returncode, 7);
  });

  it("reports a signal death as a negative number", async () => {
    const run = node("-e", "process.kill(process.pid, 'SIGKILL')").with({
      check: false,
    });
    assert.equal(await run.returncode, -9);
  });

  it("feeds stdin and pipes between real commands", async () => {
    const upper = node(
      "-e",
      "process.stdin.on('data', d => process.stdout.write(String(d).toUpperCase()))",
    );
    assert.equal(await upper.with({ input: "hello" }), "HELLO");
    const piped = node("-p", "'a\\nb\\n'").pipe(upper);
    assert.equal(await piped, "A\nB\n\n");
  });

  it("times out slow commands, and a call timeout overrides the shell's", async () => {
    const sleep = "setTimeout(() => {}, 5000)";
    await assert.rejects(
      clone(node, { timeout: 0.2 })("-e", sleep).stdout,
      CommandTimeout,
    );
    await assert.rejects(
      clone(node, { timeout: 30 })("-e", sleep).with({ timeout: 0.2 }).stdout,
      CommandTimeout,
    );
    assert.equal(
      await clone(node, { timeout: 0.2 })("-p", "1").with({ timeout: 30 }),
      "1\n",
    );
  });

  it("passes output through when capture is off", async () => {
    const completed = await node("-e", "").with({ capture: false }).completed;
    assert.deepEqual([completed.stdout, completed.stderr], ["", ""]);
  });

  it("rejects when the executable is missing", async () => {
    await assert.rejects(sh["definitely-not-a-command-xyz"]().stdout, {
      code: "ENOENT",
    });
  });
});
