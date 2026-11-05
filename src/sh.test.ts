import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";
import {
  argsOf,
  CommandFailed,
  CommandTimeout,
  clone,
  FalseRunner,
  type Flags,
  git,
  makeRunner,
  type Output,
  quote,
  Run,
  type Runner,
  type RunRequest,
  renderFlags,
  Sh,
  settingsOf,
  sh,
  TrueRunner,
  withExitCode,
} from "./sh.ts";

const streams = { stdout: "out", stderr: "err" };

function recording(output: Output | Promise<Output> = streams) {
  const calls: RunRequest[] = [];
  const respond = makeRunner(() => output);
  const runner: Runner = (request) => {
    calls.push(request);
    return respond(request);
  };
  return { calls, runner };
}

const echo = makeRunner((args) => ({ stdout: args.join("\n") }));
const cat = makeRunner((_args, _cwd, input) => ({ stdout: input ?? "" }));

function recordingLogger() {
  const events: unknown[][] = [];
  return {
    events,
    logger: { warn: (...event: unknown[]) => events.push(event) },
  };
}

describe("flags", () => {
  const cases: [string, Flags, string[]][] = [
    ["long value", { name: "x" }, ["--name=x"]],
    ["long switch", { detach: true }, ["--detach"]],
    ["omitted values", { a: false, b: null, c: undefined }, []],
    ["zero", { count: 0 }, ["--count=0"]],
    ["underscore", { dry_run: true }, ["--dry-run"]],
    ["short switch", { v: true }, ["-v"]],
    ["short value", { m: "a message" }, ["-m", "a message"]],
    ["long array", { tag: ["a", "b"] }, ["--tag=a", "--tag=b"]],
    ["short array", { I: ["a", "b"] }, ["-I", "a", "-I", "b"]],
    ["empty collections", { tag: [], env: {} }, []],
    [
      "record values",
      { env: { A: "1", B: 2, C: false } },
      ["--env=A=1", "--env=B=2", "--env=C=false"],
    ],
    ["short record", { e: { A: "1" } }, ["-e", "A=1"]],
  ];
  for (const [name, flags, expected] of cases) {
    it(`renders ${name}`, () => assert.deepEqual(renderFlags(flags), expected));
  }
  for (const [value, expected] of [
    ["plain/path-1.txt", "plain/path-1.txt"],
    ["some value", "'some value'"],
    ["", "''"],
    ["it's", `'it'"'"'s'`],
  ]) {
    it(`quotes ${JSON.stringify(value)}`, () =>
      assert.equal(quote(value), expected));
  }
});

describe("commands", () => {
  it("provides empty and git command prefixes", () => {
    assert.deepEqual(argsOf(sh), []);
    assert.deepEqual(argsOf(git), ["git"]);
    assert.deepEqual(Sh(undefined, { runner: TrueRunner })("tool", 5).args, [
      "tool",
      "5",
    ]);
  });

  it("inherits settings without mutating the original prefix", () => {
    const base = Sh(["tool"], { timeout: 3, check: false });
    const derived = base.remote["show-all"];

    assert.deepEqual(argsOf(derived), ["tool", "remote", "show-all"]);
    assert.deepEqual(argsOf(base), ["tool"]);
    assert.deepEqual(settingsOf(derived), settingsOf(base));
  });

  it("renders arguments and options in order with a quoted display command", () => {
    const run = Sh("tool").$({ v: true })("a", { m: "x y" }, "b");

    assert.deepEqual(run.args, ["tool", "-v", "a", "-m", "x y", "b"]);
    assert.equal(run.command, "tool -v a -m 'x y' b");
  });

  it("leaves a shell unexecuted when awaited or serialized", async () => {
    const { calls, runner } = recording();
    const shell = Sh("tool", { runner });

    assert.equal(await shell, shell);
    assert.equal(JSON.stringify({ shell }), "{}");
    assert.equal(calls.length, 0);
  });

  it("rejects inspection of a non-shell", () => {
    assert.throws(() => argsOf({} as never), TypeError);
  });
});

describe("execution", () => {
  it("shares pending and cached execution across all output reads", async () => {
    const pending = Promise.withResolvers<Output>();
    const { calls, runner } = recording(pending.promise);
    const run = Sh("tool", { runner })("arg").with({ cwd: "/tmp" });
    const reads = Promise.all([
      run.stdout,
      run.stderr,
      run.returncode,
      run.completed,
      run,
    ]);

    await setImmediate();
    pending.resolve(streams);
    const values = await reads;
    const cached = await run.completed;

    assert.deepEqual(values, ["out", "err", 0, cached, "out"]);
    assert.deepEqual(calls, [
      { args: ["tool", "arg"], capture: true, cwd: "/tmp" },
    ]);
    assert.strictEqual(values[3], cached);
  });

  it("checks and caches completed failures for every output read", async () => {
    const { calls, runner } = recording({ ...streams, returncode: 7 });
    const run = Sh("tool", { runner })("arg");
    const reads = [run.stdout, run.stderr, run.returncode, run.completed, run];
    const error = {
      name: "CommandFailed",
      command: "tool arg",
      returncode: 7,
      ...streams,
    };

    await Promise.all(
      reads.map((read) => assert.rejects(Promise.resolve(read), error)),
    );
    await assert.rejects(run.stdout, CommandFailed);

    assert.equal(calls.length, 1);
  });

  for (const error of [
    new CommandTimeout(["tool"], 1, {}),
    Object.assign(new Error("launch failed"), { code: "ENOENT" }),
  ]) {
    it(`retries execution after ${error.name}: ${error.message}`, async () => {
      let calls = 0;
      const runner = makeRunner(() => {
        if (++calls === 1) throw error;
        return { stdout: "recovered" };
      });
      const run = Sh("tool", { runner })();

      await assert.rejects(run.stdout, (actual) => actual === error);
      const output = await run;

      assert.equal(output, "recovered");
      assert.equal(calls, 2);
    });
  }

  it("changes stdin on a copy without changing the original run", async () => {
    const original = Sh("cat", { runner: cat })().with({ input: "original" });
    const copy = original.with({ input: "changed" });

    const outputs = await Promise.all([original, copy]);

    assert.deepEqual(outputs, ["original", "changed"]);
  });
});

describe("capture", () => {
  for (const capture of [true, false]) {
    it(`returns ${capture ? "stdout and captured output" : "a completion record without output"}`, async () => {
      const { runner } = recording({ ...streams, returncode: 7 });
      const run = Sh("tool", { runner, capture, check: false })();
      const base = { args: ["tool"], returncode: 7 };

      const [value, completed, code] = await Promise.all([
        run,
        run.completed,
        run.returncode,
      ]);

      assert.deepEqual(value, capture ? "out" : base);
      assert.deepEqual(completed, capture ? { ...base, ...streams } : base);
      assert.equal(code, 7);
      assert.equal("stdout" in run, capture);
      assert.equal("stderr" in run, capture);
    });
  }
});

describe("pipes", () => {
  it("defers both commands and forwards captured stdout once", async () => {
    const source = recording({ stdout: "piped" });
    const target = recording({ stdout: "consumed" });
    const run = Sh("source", { runner: source.runner })().pipe(
      Sh("target", { runner: target.runner })(),
    );

    await setImmediate();
    assert.equal(source.calls.length, 0);
    assert.equal(target.calls.length, 0);
    const output = await run;

    assert.equal(output, "consumed");
    assert.equal(source.calls.length, 1);
    assert.equal(target.calls.length, 1);
    assert.equal(target.calls[0]?.input, "piped");
  });

  it("reuses a directly constructed run's cached output", async () => {
    const { calls, runner } = recording({ stdout: "piped" });
    const source = new Run<true>({
      args: ["source"],
      settings: { ...settingsOf(Sh()), capture: true, runner },
      input: undefined,
    });
    await source;

    const output = await source.pipe(Sh("cat", { runner: cat })());

    assert.equal(output, "piped");
    assert.equal(calls.length, 1);
  });

  it("preserves the target's uncaptured completion record", async () => {
    const target = recording();
    const run = Sh("echo", { runner: echo })("hi").pipe(
      Sh("target", { runner: target.runner, capture: false })(),
    );

    const completed = await run;

    assert.deepEqual(completed, { args: ["target"], returncode: 0 });
    assert.equal(target.calls[0]?.input, "echo\nhi");
  });

  it("propagates a delayed source failure without starting the target", async () => {
    const target = recording();
    const run = Sh("false", { runner: FalseRunner })().pipe(
      Sh("target", { runner: target.runner })(),
    );
    await setImmediate();

    await assert.rejects(run.stdout, CommandFailed);

    assert.equal(target.calls.length, 0);
  });
});

describe("promise methods", () => {
  it("transforms stdout with then", async () => {
    const run = Sh("tool", { runner: echo })();

    const output = await run.then((value) => value.toUpperCase());

    assert.equal(output, "TOOL");
  });

  it("bypasses catch on success", async () => {
    const run = Sh("tool", { runner: echo })();

    const output = await run.catch(() => assert.fail("unexpected failure"));

    assert.equal(output, "tool");
  });

  it("recovers a checked failure with catch", async () => {
    const run = Sh("tool", { runner: FalseRunner })();

    const code = await run.catch((error) => {
      assert.ok(error instanceof CommandFailed);
      return error.returncode;
    });

    assert.equal(code, 1);
  });

  for (const returncode of [0, 7]) {
    it(`awaits finally's cleanup and preserves ${returncode === 0 ? "the completion record" : "rejection"}`, async () => {
      let cleaned = false;
      const run = Sh("tool", {
        runner: withExitCode(returncode),
        capture: false,
      })();

      const outcome = run.finally(async () => {
        await setImmediate();
        cleaned = true;
      });

      if (returncode === 0)
        assert.deepEqual(await outcome, { args: ["tool"], returncode });
      else await assert.rejects(outcome, { name: "CommandFailed", returncode });
      assert.equal(cleaned, true);
    });
  }
});

describe("exit checking", () => {
  for (const [setting, override, rejects] of [
    [true, undefined, true],
    [true, false, false],
    [false, undefined, false],
    [false, true, true],
  ] as const) {
    it(`check=${setting}, override=${override} ${rejects ? "rejects" : "returns the exit code"}`, async () => {
      const run = Sh("tool", {
        runner: withExitCode(7),
        check: setting,
      })().with(override === undefined ? {} : { check: override });

      if (rejects)
        await assert.rejects(run.returncode, {
          name: "CommandFailed",
          returncode: 7,
        });
      else assert.equal(await run.returncode, 7);
    });
  }
});

describe("fake runners", () => {
  it("forwards arguments, working directory, and stdin to the callback", async () => {
    const seen: unknown[] = [];
    const output = { returncode: 3, ...streams };
    const runner = makeRunner((...context) => {
      seen.push(context);
      return output;
    });
    const request = {
      args: ["tool"],
      capture: true,
      cwd: "/repo",
      input: "in",
    } as const;

    const completed = await runner(request);

    assert.deepEqual(seen, [[request.args, "/repo", "in"]]);
    assert.deepEqual(completed, { args: request.args, ...output });
  });

  for (const [runner, returncode] of [
    [TrueRunner, 0],
    [FalseRunner, 1],
    [withExitCode(9), 9],
  ] as const) {
    it(`returns ${returncode} with empty captured output`, async () => {
      const args = ["tool"];
      const completed = await runner({ args, capture: true, cwd: "." });

      assert.deepEqual(completed, { args, returncode, stdout: "", stderr: "" });
    });
  }
});

describe("failure logging", () => {
  it("logs the command and captured failure before rethrowing by default", async () => {
    const { events, logger } = recordingLogger();
    const { runner } = recording({ ...streams, returncode: 5 });
    const run = Sh("tool", { runner, cwd: "/work" })("arg");

    await assert.rejects(run.checkReturncode({ logger }), {
      name: "CommandFailed",
      returncode: 5,
    });

    assert.deepEqual(events, [
      [
        "tool arg",
        { cwd: "/work", command: "tool arg", stdout: "out", stderr: "err" },
      ],
    ]);
  });

  it("checks an unchecked, uncaptured failure and logs a custom event without rethrowing", async () => {
    const { events, logger } = recordingLogger();
    const run = Sh("tool", {
      runner: FalseRunner,
      check: false,
      capture: false,
    })("arg");

    const completed = await run.checkReturncode({
      logger,
      event: "failed",
      reraise: false,
    });

    assert.equal(completed, undefined);
    assert.deepEqual(events, [
      ["failed", { cwd: ".", command: "tool arg", stdout: null, stderr: null }],
    ]);
  });

  it("returns a successful completion without logging", async () => {
    const { events, logger } = recordingLogger();

    const completed = await Sh("tool", {
      runner: TrueRunner,
    })().checkReturncode({ logger });

    assert.equal(completed?.returncode, 0);
    assert.deepEqual(events, []);
  });

  it("logs an execution failure once without inventing completed output", async () => {
    const { events, logger } = recordingLogger();
    let calls = 0;
    const run = Sh("tool", {
      runner: () => {
        calls++;
        throw new CommandTimeout(["tool"], 1, { stdout: "partial" });
      },
    })("arg");

    await assert.rejects(run.checkReturncode({ logger }), CommandTimeout);

    assert.equal(calls, 1);
    assert.deepEqual(events, [
      [
        "tool arg",
        { cwd: ".", command: "tool arg", stdout: null, stderr: null },
      ],
    ]);
  });
});

describe("settings", () => {
  it("logs the quoted command at construction only when enabled", () => {
    const messages: unknown[] = [];
    const logger = {
      info: (message: unknown) => messages.push(message),
      warn() {},
    };

    Sh("tool", { logger, log: true })("some value");
    Sh("tool", { logger })("quiet");

    assert.deepEqual(messages, ["tool 'some value'"]);
  });

  it("clones arguments and defined settings without changing the original", () => {
    const original = Sh("tool", { check: false, log: true, timeout: 9 });
    const before = { ...settingsOf(original) };
    const overrides = { check: true, log: false, timeout: 0 };
    const changed = clone(original, overrides);

    assert.deepEqual(argsOf(changed), ["tool"]);
    assert.deepEqual(settingsOf(changed), { ...before, ...overrides });
    assert.deepEqual(settingsOf(original), before);
    assert.deepEqual(
      settingsOf(clone(changed, { timeout: undefined })),
      settingsOf(changed),
    );
  });

  it("uses capture and checking by default without logging or a timeout", () => {
    const defaults = settingsOf(Sh());

    assert.equal(defaults.check, true);
    assert.equal(defaults.capture, true);
    assert.equal(defaults.cwd, ".");
    assert.equal(defaults.log, false);
    assert.equal(defaults.runner, undefined);
    assert.equal(defaults.timeout, undefined);
  });

  for (const [timeout, override, expected] of [
    [undefined, undefined, undefined],
    [4, undefined, 4],
    [undefined, 5, 5],
    [30, 0, 0],
  ] as const) {
    it(`passes timeout=${timeout} with override=${override} as ${expected}`, async () => {
      const { calls, runner } = recording();
      const run = Sh("tool", { runner, timeout })().with(
        override === undefined ? {} : { timeout: override },
      );

      await run.completed;

      assert.deepEqual(
        calls.map((call) => call.timeout),
        [expected],
      );
      assert.equal("timeout" in (calls[0] ?? {}), expected !== undefined);
    });
  }
});

describe("runner factories", () => {
  it("loads lazily and shares one pending factory across concurrent commands", async () => {
    let loads = 0;
    const tool = Sh("tool", {
      factory: async () => {
        loads++;
        await setImmediate();
        return echo;
      },
    });
    const first = tool("a").with({ cwd: "/tmp", capture: true });
    const second = tool.sub("b");
    await setImmediate();
    assert.equal(loads, 0);

    const values = await Promise.all([first, second]);

    assert.deepEqual(values, ["tool\na", "tool\nsub\nb"]);
    assert.equal(loads, 1);
  });

  it("uses an explicit runner without loading the factory", async () => {
    const tool = Sh("tool", {
      runner: echo,
      factory: () => assert.fail("unexpected factory load"),
    });

    const output = await tool("x");

    assert.equal(output, "tool\nx");
  });

  for (const asynchronous of [false, true]) {
    it(`retries a factory that ${asynchronous ? "rejects" : "throws"}`, async () => {
      let loads = 0;
      const error = new Error("not yet");
      const tool = Sh("tool", {
        factory: () => {
          if (++loads > 1) return echo;
          if (asynchronous) return Promise.reject(error);
          throw error;
        },
      });

      await assert.rejects(tool("a").stdout, (actual) => actual === error);
      const output = await tool("b");

      assert.equal(output, "tool\nb");
      assert.equal(loads, 2);
    });
  }
});
