import { DEFAULT_LOGGER, type Logger } from "./log.ts";

/**
 * Fluent shell commands.
 *
 * ```ts
 * // Get a file listing using the `ls` command.
 * const listing = await sh.ls("-la");
 * 
 * // Call `git` in the working directory of the process
 * const status = await sh.git.status({ short: true });
 * const pick = await sh.git["cherry-pick"]("abc123").returncode; // throws unless .with({ check: false })
 * 
 * // Using the memoized `git` caller
 * const status = await git.status({ short: true });
 * const pick = await git["cherry-pick"]("abc123").returncode; // throws unless .with({ check: false })
 *
 * // Call `docker` using positional arguments.
 * const selected = await sh.docker
 * .$({ c: "dev" }) // Pass docker context
 * .run.$({ // set `docker run` arguments
 *   i: true,
 *   rm: true,
 *   c: 512,
 *   network: "dev",
 *   e: { PGPASSWORD: "dev" },
 * }) 
 * ( // a full argv for inside docker
 *   "postgres:16",
 *   "sh",
 *   "-c",
 *   "exec psql -h db -U postgres -d postgres -v ON_ERROR_STOP=1 -f -",
 * )
 * // and pipe input
 * .with({ input: "SELECT current_database();\n" });
 * ```
 *
 * Property access appends a command segment, a call appends arguments and returns
 * a lazy {@link Run}, and nothing executes until the `Run` is awaited or one of its
 * outputs is read. Arguments are passed directly to the executable.
 */

// ── Options and arguments ───────────────────────────────────────────────────

/** A command-line option's value. See {@link renderFlag}. */
export type FlagValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number)[]
  | Readonly<Record<string, string | number | boolean>>;

/** Options keyed by name; rendered in place wherever the object appears in a call. */
export type Flags = Readonly<Record<string, FlagValue>>;

/** A positional argument, or an options object rendered at that position. */
export type Arg = string | number | Flags;

/** `shlex.quote`: leave safe words bare, single-quote everything else. */
export function quote(arg: string): string {
  if (arg === "") return "''";
  if (/^[\w@%+=:,./-]+$/.test(arg)) return arg;
  return `'${arg.replaceAll("'", `'"'"'`)}'`;
}

/**
 * Render one option the way most CLIs accept it.
 *
 * `null`, `undefined`, and `false` omit the option; `true` is a bare switch. An
 * array repeats the option, and a record repeats it as `KEY=VALUE` (docker's
 * `--env`, `--label`). A one-letter key is a short option with its value as a
 * separate argument; a longer key is `--key=value`, with `_` written as `-`.
 */
export function renderFlag(key: string, value: FlagValue): string[] {
  if (value == null || value === false) return [];
  const short = key.length === 1;
  const flag = short ? `-${key}` : `--${key.replaceAll("_", "-")}`;
  if (value === true) return [flag];
  const values = Array.isArray(value)
    ? value.map(String)
    : typeof value === "object"
      ? Object.entries(value).map(([name, val]) => `${name}=${val}`)
      : [String(value)];
  return values.flatMap((val) => (short ? [flag, val] : [`${flag}=${val}`]));
}

export function renderFlags(flags: Flags): string[] {
  return Object.entries(flags).flatMap(([key, value]) =>
    renderFlag(key, value),
  );
}

function renderArgs(args: readonly Arg[]): string[] {
  return args.flatMap((arg) =>
    typeof arg === "object" ? renderFlags(arg) : [String(arg)],
  );
}

// ── Results, errors, and runners ────────────────────────────────────────────

/** The outcome of a finished command. */
export interface Completed {
  args: readonly string[];
  returncode: number;
}

/** A finished command whose output was captured. */
export interface CompletedWithCapture extends Completed {
  stdout: string;
  stderr: string;
}

export type CompletedFor<Capture extends boolean> = Capture extends true
  ? CompletedWithCapture
  : Completed;

/** Everything a {@link Runner} is asked to execute. `input` and `timeout` are absent unless set. */
export interface RunRequest<Capture extends boolean = boolean> {
  args: readonly string[];
  capture: Capture;
  cwd: string | URL;
  input?: string;
  /** Seconds, possibly fractional. */
  timeout?: number;
}

/**
 * Executes a command. A runner reports the exit code and never checks it; the
 * `Run` raises {@link CommandFailed} when `check` is set.
 */
export type Runner = <Capture extends boolean>(
  request: RunRequest<Capture>,
) => CompletedFor<Capture> | Promise<CompletedFor<Capture>>;

/** Supplies a {@link Runner} on first use, so a host-specific one can be loaded lazily. */
export type RunnerFactory = () => Runner | Promise<Runner>;

/** Loads the Node runner from `sh_node.ts` only when a command first runs. */
export const nodeRunnerFactory: RunnerFactory = async () =>
  (await import("./sh_node.ts")).nodeRunner;

const factoryRunners = new WeakMap<RunnerFactory, Promise<Runner>>();

async function resolveRunner({
  runner,
  factory,
}: Pick<Settings, "runner" | "factory">): Promise<Runner> {
  if (runner) return runner;
  let loaded = factoryRunners.get(factory);
  if (!loaded) {
    loaded = Promise.resolve(factory());
    factoryRunners.set(factory, loaded);
    // A failed load is retried by the next command.
    loaded.catch(() => factoryRunners.delete(factory));
  }
  return loaded;
}

/** A command exited nonzero while `check` was set. */
export class CommandFailed extends Error {
  readonly command: string;
  readonly returncode: number;
  readonly stdout: string;
  readonly stderr: string;

  constructor(completed: Completed | CompletedWithCapture) {
    const command = completed.args.map(quote).join(" ");
    super(
      `Command '${command}' returned non-zero exit status ${completed.returncode}.`,
    );
    this.name = "CommandFailed";
    this.command = command;
    this.returncode = completed.returncode;
    this.stdout = "stdout" in completed ? completed.stdout : "";
    this.stderr = "stderr" in completed ? completed.stderr : "";
  }
}

/** A command ran past its timeout and was killed. */
export class CommandTimeout extends Error {
  readonly command: string;
  readonly timeout: number;
  readonly stdout: string;
  readonly stderr: string;

  constructor(args: readonly string[], timeout: number, output: Output) {
    const command = args.map(quote).join(" ");
    super(`Command '${command}' timed out after ${timeout} seconds.`);
    this.name = "CommandTimeout";
    this.command = command;
    this.timeout = timeout;
    this.stdout = output.stdout ?? "";
    this.stderr = output.stderr ?? "";
  }
}

/** Canned output for a fake command. */
export interface Output {
  returncode?: number;
  stdout?: string;
  stderr?: string;
}

/** A fake command: sees the arguments, working directory, and stdin. */
export type RunnerCallback = (
  args: readonly string[],
  cwd: string | URL,
  input: string | undefined,
) => Output | Promise<Output>;

/** Adapt a callback into a {@link Runner}; the adapter applies `capture`. */
export function makeRunner(callback: RunnerCallback): Runner {
  function runner<Capture extends boolean>(
    request: RunRequest<Capture>,
  ): Promise<CompletedFor<Capture>>;
  async function runner({
    args,
    capture,
    cwd,
    input,
  }: RunRequest): Promise<Completed | CompletedWithCapture> {
    const output = await callback(args, cwd, input);
    const completed: Completed = {
      args,
      returncode: output.returncode ?? 0,
    };
    return capture
      ? {
          ...completed,
          stdout: output.stdout ?? "",
          stderr: output.stderr ?? "",
        }
      : completed;
  }
  return runner;
}

/** A runner that exits with a fixed code and prints nothing. */
export function withExitCode(returncode: number): Runner {
  return makeRunner(() => ({ returncode }));
}

export const TrueRunner: Runner = withExitCode(0);
export const FalseRunner: Runner = withExitCode(1);

// ── Run ─────────────────────────────────────────────────────────────────────

export interface Settings<Capture extends boolean = boolean> {
  /** Reject with {@link CommandFailed} on a nonzero exit. Default `true`. */
  check: boolean;
  /** Capture stdout and stderr; otherwise they pass through to this process. Default `true`. */
  capture: Capture;
  /** Working directory. Default `"."`. */
  cwd: string | URL;
  /** Log each command, shell-quoted, when its `Run` is created. Default `false`. */
  log: boolean;
  /** Receives command and failure logs. Default is the jiffies default logger. */
  logger: Pick<Logger, "info" | "warn">;
  /** Executes commands. When unset, `factory` supplies one on first use. */
  runner: Runner | undefined;
  /** Supplies the runner once, lazily, and shares it. Default loads the Node runner. */
  factory: RunnerFactory;
  /** Seconds, possibly fractional, a command may run before {@link CommandTimeout}; `undefined` for no limit. */
  timeout: number | undefined;
}

const DEFAULTS: Settings = {
  check: true,
  capture: true,
  cwd: ".",
  log: false,
  logger: DEFAULT_LOGGER,
  runner: undefined,
  factory: nodeRunnerFactory,
  timeout: undefined,
};

/** Overlay the defined entries of `overrides` onto `settings`. */
function merge(settings: Settings, overrides: Partial<Settings>): Settings {
  return {
    ...settings,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => value !== undefined),
    ),
  };
}

/** Per-run settings; apply with {@link Run.with} before the command starts. */
export interface RunOptions {
  check?: boolean;
  capture?: boolean;
  cwd?: string | URL;
  timeout?: number;
  /** Text for the command's stdin. */
  input?: string;
}

export interface CheckOptions {
  /** The log message; defaults to the command. */
  event?: string;
  logger?: Pick<Logger, "warn">;
  /** Rethrow after logging. Default `true`. */
  reraise?: boolean;
}

interface RunState<Capture extends boolean = boolean> {
  args: readonly string[];
  settings: Settings<Capture>;
  input: string | PromiseLike<string> | (() => Promise<string>) | undefined;
}

type RunValue<Capture extends boolean> = Capture extends true
  ? string
  : Completed;

export type RunFor<Capture extends boolean> = Capture extends true
  ? RunWithCapture
  : Run<false>;

/**
 * A command that has not necessarily run yet. It executes once, on first use, and
 * caches its result; a timed-out or failed-to-launch command is not cached.
 *
 * A `Run` resolves to stdout when capturing, or the completion record otherwise.
 * Every run exposes `.returncode` and `.completed`; {@link RunWithCapture} also
 * exposes `.stdout` and `.stderr`. With
 * `check` set (the default) every read rejects with {@link CommandFailed} on a
 * nonzero exit; use `.with({ check: false })` when the exit code is data.
 */
export class Run<Capture extends boolean = boolean>
  implements PromiseLike<RunValue<Capture>>
{
  readonly #state: RunState<Capture>;
  #result: Promise<CompletedFor<Capture>> | undefined;

  constructor(state: RunState<Capture>) {
    this.#state = state;
  }

  /** The executable and its arguments. */
  get args(): readonly string[] {
    return this.#state.args;
  }

  /** The shell-quoted command, for display. */
  get command(): string {
    return this.args.map(quote).join(" ");
  }

  get cwd(): string | URL {
    return this.#state.settings.cwd;
  }

  /** A copy of this command with per-run settings changed; it has not run. */
  with<Next extends boolean>(
    options: RunOptions & { capture: Next },
  ): RunFor<Next>;
  with(options: RunOptions & { capture?: undefined }): RunFor<Capture>;
  with(options: RunOptions): RunFor<boolean>;
  with(options: RunOptions): RunFor<boolean> {
    const { input, ...settings } = options;
    return createRun({
      ...this.#state,
      settings: merge(this.#state.settings, settings),
      input: input ?? this.#state.input,
    });
  }

  /** Feed captured stdout to a lazy copy of `next`, preserving its capture setting. */
  // Keep capture inference when declaration emit erases the private state.
  pipe(this: Run<true>, next: Run<true>): RunWithCapture;
  pipe<Next extends boolean>(this: Run<true>, next: Run<Next>): RunFor<Next>;
  pipe<Next extends boolean>(this: Run<true>, next: Run<Next>): RunFor<Next> {
    return createRun({
      ...next.#state,
      input: async () => (await this.completed).stdout,
    });
  }

  get completed(): Promise<CompletedFor<Capture>> {
    return this.#execute().then((completed) => {
      if (this.#state.settings.check && completed.returncode !== 0) {
        throw new CommandFailed(completed);
      }
      return completed;
    });
  }

  get returncode(): Promise<number> {
    return this.completed.then((completed) => completed.returncode);
  }

  // biome-ignore lint/suspicious/noThenProperty: a Run is deliberately awaitable.
  then<A = RunValue<Capture>, B = never>(
    onfulfilled?: ((value: RunValue<Capture>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): Promise<A | B> {
    return this.#value().then(onfulfilled, onrejected);
  }

  catch<B = never>(
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): Promise<RunValue<Capture> | B> {
    return this.#value().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<RunValue<Capture>> {
    return this.#value().finally(onfinally);
  }

  async #value(): Promise<RunValue<Capture>> {
    const completed: Completed | CompletedWithCapture = await this.completed;
    return (
      this.#state.settings.capture && "stdout" in completed
        ? completed.stdout
        : completed
    ) as RunValue<Capture>;
  }

  /**
   * Run with automatic checking off, then check the exit code here. A failure
   * is logged as a warning with the command, working directory, and output,
   * and rethrown unless `reraise` is `false`. Resolves to the result, or
   * `undefined` when the failure was logged and not rethrown.
   */
  async checkReturncode({
    event,
    logger = this.#state.settings.logger,
    reraise = true,
  }: CheckOptions = {}): Promise<CompletedFor<Capture> | undefined> {
    let completed: CompletedFor<Capture> | undefined;
    try {
      completed = await this.#execute();
      if (completed.returncode !== 0) throw new CommandFailed(completed);
      return completed;
    } catch (error) {
      logger.warn(event ?? this.command, {
        cwd: this.cwd,
        command: this.command,
        stdout: completed && "stdout" in completed ? completed.stdout : null,
        stderr: completed && "stderr" in completed ? completed.stderr : null,
      });
      if (reraise) throw error;
      return undefined;
    }
  }

  #execute(): Promise<CompletedFor<Capture>> {
    this.#result ??= (async () => {
      const { capture, cwd, timeout } = this.#state.settings;
      const pendingInput = this.#state.input;
      const [runner, input] = await Promise.all([
        resolveRunner(this.#state.settings),
        typeof pendingInput === "function" ? pendingInput() : pendingInput,
      ]);
      return runner({
        args: this.#state.args,
        capture,
        cwd,
        ...(input === undefined ? {} : { input }),
        ...(timeout === undefined ? {} : { timeout }),
      });
    })().catch((error) => {
      this.#result = undefined;
      throw error;
    });
    return this.#result;
  }
}

/** A run that captures output; awaiting it resolves to stdout. */
export class RunWithCapture extends Run<true> {
  get stdout(): Promise<string> {
    return this.completed.then((completed) => completed.stdout);
  }

  get stderr(): Promise<string> {
    return this.completed.then((completed) => completed.stderr);
  }
}

function createRun<Capture extends boolean>(
  state: RunState<Capture>,
): RunFor<Capture>;
function createRun(state: RunState): RunFor<boolean> {
  return state.settings.capture
    ? new RunWithCapture({
        ...state,
        settings: { ...state.settings, capture: true },
      })
    : new Run<false>({
        ...state,
        settings: { ...state.settings, capture: false },
      });
}

// ── Sh ──────────────────────────────────────────────────────────────────────

/**
 * A reusable command prefix. Property access appends a segment (`git.status`,
 * `git["cherry-pick"]`); `$(...)` appends segments and options without running,
 * for options that belong before the subcommand; calling it appends arguments
 * and returns a {@link Run}. An options object anywhere in the arguments is
 * rendered in place by {@link renderFlag}.
 *
 * `$`, `then`, and `toJSON` are reserved; every other name is a segment.
 */
export type Sh<Capture extends boolean = true> = ShCall<Capture> &
  ShSegments<Capture> & { $(...segments: Arg[]): Sh<Capture> };

type ShCall<Capture extends boolean> = (...args: Arg[]) => RunFor<Capture>;

interface ShSegments<Capture extends boolean> {
  readonly [segment: string]: Sh<Capture>;
}

interface ShState<Capture extends boolean = boolean> {
  args: readonly string[];
  settings: Settings<Capture>;
}

const states = new WeakMap<object, ShState>();

function build<Capture extends boolean>(state: ShState<Capture>): Sh<Capture> {
  const proxy = new Proxy(() => {}, {
    apply(_target, _this, args: Arg[]) {
      const run = createRun({
        args: [...state.args, ...renderArgs(args)],
        settings: state.settings,
        input: undefined,
      });
      if (state.settings.log) state.settings.logger.info(run.command);
      return run;
    },
    get(_target, key) {
      if (typeof key === "symbol" || key === "then" || key === "toJSON") {
        return undefined;
      }
      if (key === "$") {
        return (...segments: Arg[]) => extend(state, renderArgs(segments));
      }
      return extend(state, [key]);
    },
  }) as unknown as Sh<Capture>;
  states.set(proxy, state);
  return proxy;
}

function extend<Capture extends boolean>(
  state: ShState<Capture>,
  segments: string[],
): Sh<Capture> {
  return build({ ...state, args: [...state.args, ...segments] });
}

function createShell<Capture extends boolean>(
  command: string | readonly string[] | undefined,
  settings: Partial<Settings> & { capture: Capture },
): Sh<Capture>;
function createShell(
  command?: string | readonly string[],
  settings?: Partial<Settings> & { capture?: undefined },
): Sh<true>;
function createShell(
  command: string | readonly string[] | undefined,
  settings: Partial<Settings>,
): Sh<boolean>;
function createShell(
  command?: string | readonly string[],
  settings: Partial<Settings> = {},
): Sh<boolean> {
  return build({
    args: typeof command === "string" ? [command] : [...(command ?? [])],
    settings: merge(DEFAULTS, settings),
  });
}

/** Create a shell, optionally starting from a command. */
export const Sh = createShell;

function stateOf(shell: Sh<boolean>): ShState {
  const state = states.get(shell);
  if (!state) throw new TypeError("Not an Sh");
  return state;
}

/** The arguments accumulated so far. */
export function argsOf(shell: Sh<boolean>): readonly string[] {
  return stateOf(shell).args;
}

/** The settings of a shell. */
export function settingsOf(shell: Sh<boolean>): Readonly<Settings> {
  return stateOf(shell).settings;
}

/** Another shell with the same arguments and the given settings replaced. */
export function clone<Original extends boolean, Capture extends boolean>(
  shell: Sh<Original>,
  settings: Partial<Settings> & { capture: Capture },
): Sh<Capture>;
export function clone<Capture extends boolean>(
  shell: Sh<Capture>,
  settings: Partial<Settings> & { capture?: undefined },
): Sh<Capture>;
export function clone(
  shell: Sh<boolean>,
  settings: Partial<Settings>,
): Sh<boolean>;
export function clone(
  shell: Sh<boolean>,
  settings: Partial<Settings>,
): Sh<boolean> {
  const state = stateOf(shell);
  return build({ ...state, settings: merge(state.settings, settings) });
}

/** Any command: `sh.ls("-la")`, `sh("ls", "-la")`. */
export const sh: Sh = Sh();

/** `git`: `git.status({ short: true })`. */
export const git: Sh = Sh("git");
