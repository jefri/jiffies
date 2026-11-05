---
name: using-jiffies-sh
description: Use when a Node script or tool in a project that depends on @davidsouther/jiffies must run external commands (git, docker, aws, any CLI) — instead of child_process, execa, or a hand-written exec helper.
---

# Using Jiffies Sh

## Overview

`sh.ts` is a fluent, lazy, async wrapper over subprocesses, ported from Python's `shgit`. Property access builds the command, a call adds arguments and returns a `Run`, and nothing executes until the `Run` is awaited or one of its outputs is read. Commands never go through a shell. This skill covers the Node runner, the default; other runners (Web Worker, WASM) are not documented here.

```ts
import { git, sh, Sh } from "@davidsouther/jiffies/sh.ts";

const status = await git.status({ short: true }); // stdout, as a string
const listing = await sh.ls("-la");
```

Do not wrap calls in an `exec()` helper that maps errors, supplies stdin, or tolerates failure. `Run` already does those, and a wrapper hides which call failed.

## The model

- `Sh` is an immutable command prefix: `git`, `sh` (empty prefix), or `Sh("docker")`. Every property access returns a new `Sh`.
- Calling an `Sh` returns a lazy `Run`. It executes once, on first use, and caches.
- `await run` resolves to stdout. `await run.stdout`, `.stderr`, `.returncode`, and `.completed` (all of them) are promises.
- With the default `check: true`, every read rejects with `CommandFailed` on a nonzero exit. The error carries `command`, `returncode`, `stdout`, and `stderr`.
- Reserved keys: `$`, `then`, `toJSON`. Every other name is a command segment.

## Building commands

| Need | Write |
|------|-------|
| Subcommand | `git.status`, `git.remote.add` |
| Name that is not an identifier | `git["cherry-pick"]`, `sh["/usr/bin/env"]` |
| Positional values | `git.checkout("main")`; numbers are stringified |
| Options after the subcommand | `git.commit({ m: "msg", amend: true })` |
| Options before the subcommand, or mid-command | `git.$({ C: "/repo" }).commit()`, `docker.run.$({ detach: true, name: "db" })("postgres:16", "--", "-c", "fsync=off")` |
| Command from a variable | `sh(cmd, ...args)` |

An options object renders where it appears in the call, so ordering is explicit:

| Value | Rendered |
|-------|----------|
| `"x"`, `5432` | `--key=x`, `--key=5432` |
| `true` | `--key` |
| `false`, `null`, `undefined` | omitted |
| `["a", "b"]` | `--key=a --key=b` |
| `{ A: "1" }` | `--key=A=1` |
| one-letter key | `-k value` (`-k` alone for `true`) |

`_` in a key is written `-` (`dry_run` → `--dry-run`). For any other spelling, pass the literal string: `"--Dry-Run"`.

`$` returns an `Sh`, not a `Run`, so it can be followed by more segments. A call ends the command.

## Per-run settings

Set them with `.with(...)` before reading. `.with` returns a new `Run` and does not execute.

| Setting | Meaning |
|---------|---------|
| `check: false` | A nonzero exit is data: read `returncode` instead of catching |
| `cwd` | Working directory |
| `timeout` | Seconds, floats allowed; rejects with `CommandTimeout`, and a timed-out run is not cached |
| `input` | Text for stdin |
| `capture: false` | Pass output through to this process; `stdout`/`stderr` are `""` |

```ts
const code = await git["cherry-pick"]("abc123").with({ check: false }).returncode;
if (code !== 0) throw new Error(`cherry-pick of abc123 conflicted`); // domain error beside the call
```

Raise the domain error at the call that knows what failed. When the failure should also be logged, use `await run.checkReturncode({ event, logger, reraise })`: it logs a warning with command, cwd, stdout, and stderr, then rethrows unless `reraise: false`, in which case it resolves `undefined`.

## Output, stdin, and pipes

```ts
const out = await sh.cat().with({ input: "from stdin\n" });
const hit = await sh.printf("hello\nworld\n").pipe(sh.grep("world")); // "world\n"
```

`a.pipe(b)` is lazy: it returns `b`, which receives `a`'s stdout when read. If `a` fails, `b` rejects without running.

## Derived shells and settings

Bind a tool once and derive variants:

```ts
import { clone, Sh } from "@davidsouther/jiffies/sh.ts";

const docker = Sh("docker", { timeout: 60 });
const inRepo = clone(git, { cwd: "/path/to/checkout" });
```

`Sh(command?, settings?)` and `clone(shell, settings)` accept `check`, `capture`, `cwd`, `log`, `logger`, `runner`, `factory`, and `timeout`. A defined setting replaces the original, including `false`. `log: true` logs each quoted command when its `Run` is created. Use `argsOf(shell)` and `settingsOf(shell)` to inspect.

## Testing

Inject a fake runner; no subprocess runs.

```ts
import { makeRunner, Sh, withExitCode } from "@davidsouther/jiffies/sh.ts";

const calls: string[][] = [];
const fake = makeRunner((args, _cwd, input) => {
  calls.push([...args]);
  return { returncode: 0, stdout: input ?? "ok" };
});
const tool = Sh("tool", { runner: fake });
await tool.deploy({ env: "prod" }); // "ok"; calls[0] is ["tool", "deploy", "--env=prod"]
```

`makeRunner` returns `Output` (`returncode`, `stdout`, `stderr`, each optional) and applies `capture`. `withExitCode(n)`, `TrueRunner`, and `FalseRunner` return an exit code with no output. `Run` raises `CommandFailed` for them under `check`, so these also exercise failure handling.

## Instead of child_process

| Reaching for | Use |
|--------------|-----|
| `execFile`/`spawn` + a Promise wrapper | `await sh.tool(...)` |
| `try { … } catch` to read an exit code | `.with({ check: false }).returncode` |
| `{ input }` / `child.stdin.write` | `.with({ input })` |
| string concatenation of flags | an options object |
| `exec("a \| b")` | `a.pipe(b)` |
| `{ cwd }` repeated on every call | `clone(shell, { cwd })` |
| mocking `child_process` | `runner: makeRunner(...)` |
