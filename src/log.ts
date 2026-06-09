import { type Display, display } from "./display.ts";

export type Log = (message: Display, data?: object) => void;

export interface Logger {
  logAt: (level: number, prefix: string, fn?: (logLine: string) => void) => Log;
  level: number;
  format: <
    D extends {
      name: string;
      prefix: string;
      level: number;
      message: string;
      source: string;
    },
  >(
    data: D,
  ) => string;
  console: Console;
  default: (logLine: string) => void;
  debug: Log;
  info: Log;
  warn: Log;
  error: Log;
}

export const LEVEL = {
  UNKNOWN: 2,
  DEBUG: 1,
  VERBOSE: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  SILENT: 5,
};

export const LEVELS: Record<string, number> = {
  unknown: LEVEL.UNKNOWN,
  debug: LEVEL.DEBUG,
  verbose: LEVEL.VERBOSE,
  info: LEVEL.INFO,
  warn: LEVEL.WARN,
  error: LEVEL.ERROR,
  silent: LEVEL.SILENT,
};

export function getLogLevel(level = ""): number {
  return (
    LEVELS[level.toLowerCase()] ??
    (!Number.isNaN(+level) ? Number(level) : LEVEL.INFO)
  );
}

export function basicLogFormatter(data: {
  name: string;
  prefix: string;
  level: number;
  message: string;
  source: string;
}): string {
  return `${data.prefix}: ${data.message}`;
}

function findSource() {
  const err = new Error();
  // Stack will be:
  // findSource
  // logAt
  // {source}
  const lines = err.stack?.split("\n") ?? [];
  const atLines = lines.filter((line) => line.match(/^\s*at/));
  return atLines[2]?.trim().slice("at ".length) ?? "(unknown)";
}

export type LoggerFormatFn = <
  D extends {
    name: string;
    prefix: string;
    level: number;
    message: string;
    source: string;
  },
>(
  data: D,
) => string;

// ── prettyLogFormatter ──────────────────────────────────────────────────────
// A TTY-aware formatter: compact, color-and-glyph-coded human lines on a
// terminal, byte-identical JSON.stringify when piped/redirected so machine
// tooling is unchanged. See docs/developer/2026-06-09-A-log-formatter/design.md.

// Raw ANSI escapes; no color/log runtime dependency in this library.
const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
} as const;
type AnsiCode = keyof typeof ANSI;

// HH:MM:SS.mmm sliced from a UTC ISO 8601 string. Timezone-stable by
// construction: it never reads local-time accessors, so output depends only on
// the ISO input, not the runner's TZ.
function shortClock(iso: string): string {
  return iso.slice(11, 23);
}

// Glyph + color per severity, keyed on the numeric level (DEBUG 1, INFO 2,
// WARN 3, ERROR 4). Fixed single-column glyph so messages align vertically.
function levelGlyph(level: number): { glyph: string; color: AnsiCode } {
  if (level <= LEVEL.DEBUG) return { glyph: "·", color: "dim" };
  if (level === LEVEL.INFO) return { glyph: "ℹ", color: "green" };
  if (level === LEVEL.WARN) return { glyph: "⚠", color: "yellow" };
  return { glyph: "✖", color: "red" };
}

function methodColor(method: string): AnsiCode {
  switch (method) {
    case "GET":
      return "cyan";
    case "POST":
      return "green";
    case "PUT":
    case "PATCH":
      return "yellow";
    case "DELETE":
      return "red";
    default:
      return "white";
  }
}

function statusColor(status: number): AnsiCode {
  if (status >= 500) return "red";
  if (status >= 400) return "yellow";
  if (status >= 300) return "cyan";
  return "green";
}

// Fields that are pure metadata noise on a human terminal: `name`/`level` are
// constant or duplicate `prefix`, and `source` resolves to the info() wrapper.
// `message` is rendered on its own, never echoed into the trailing tail.
const HUMAN_DROP = new Set(["name", "prefix", "level", "source", "message"]);

export interface PrettyLogOptions {
  /** Render colored, human-shaped lines. Default: !!process.stdout.isTTY. */
  tty?: boolean;
  /** Emit ANSI color escapes. Default: same as `tty`. */
  color?: boolean;
  /** Injectable clock for deterministic timestamps in tests. Default: new Date. */
  now?: () => Date;
}

/**
 * Factory returning a {@link LoggerFormatFn} that is pretty + colored on a TTY
 * and falls back to `JSON.stringify` when not. Options resolve once at
 * construction (`tty` reads `process.stdout.isTTY`), so production piped output
 * stays JSON; tests inject `tty`/`color`/`now` for a deterministic colorless
 * layout assertable without a real terminal.
 */
export function prettyLogFormatter(
  options: PrettyLogOptions = {},
): LoggerFormatFn {
  const tty = options.tty ?? !!process.stdout.isTTY;
  const color = options.color ?? tty;
  const now = options.now ?? (() => new Date());
  const paint = (code: AnsiCode, s: string): string =>
    color ? `${ANSI[code]}${s}${ANSI.reset}` : s;

  return <
    D extends {
      name: string;
      prefix: string;
      level: number;
      message: string;
      source: string;
    },
  >(
    data: D,
  ): string => {
    if (!tty) return JSON.stringify(data);

    const record = data as unknown as Record<string, unknown>;
    const { glyph, color: glyphColor } = levelGlyph(data.level);
    const mark = paint(glyphColor, glyph);

    // Access-log shape: `<glyph> <clock> <METHOD> <path> <client> [status] [ms]`.
    // Clock comes from the request's `when` ISO (UTC slice), not now().
    if (data.message === "Request") {
      const when = typeof record.when === "string" ? record.when : "";
      const how = typeof record.how === "string" ? record.how : "";
      const space = how.indexOf(" ");
      const method = space === -1 ? how : how.slice(0, space);
      const path = space === -1 ? "" : how.slice(space + 1);
      const segments = [
        mark,
        paint("dim", shortClock(when || now().toISOString())),
        paint(methodColor(method), method),
        paint("bold", path),
      ];
      if (record.who !== undefined) {
        segments.push(paint("dim", String(record.who)));
      }
      if (record.status !== undefined) {
        segments.push(
          paint(statusColor(Number(record.status)), String(record.status)),
        );
      }
      if (record.ms !== undefined) {
        segments.push(paint("dim", `${record.ms}ms`));
      }
      return segments.filter((s) => s !== "").join(" ");
    }

    // Generic shape: `<glyph> <clock> <message> <dim key=value …>`.
    const tail = Object.entries(record)
      .filter(([key]) => !HUMAN_DROP.has(key))
      .map(([key, value]) =>
        paint(
          "dim",
          `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`,
        ),
      );
    return [
      mark,
      paint("dim", shortClock(now().toISOString())),
      paint("bold", data.message),
      ...tail,
    ].join(" ");
  };
}

export function getLogger(
  name: string,
  args: LoggerFormatFn | { format?: LoggerFormatFn; console?: Console } = {
    format: JSON.stringify,
    console,
  },
): Logger {
  if (args instanceof Function) {
    args = { format: args };
  }
  const defaultLog = (logLine: string): void => {
    logger.console.info(logLine);
  };
  const logAt =
    (
      level: number,
      prefix: string,
      fn: (logLine: string) => void = defaultLog,
    ): Log =>
    (message: Display, data?: object) =>
      level >= (logger.level ?? LEVEL.SILENT)
        ? fn(
            logger.format?.({
              name,
              prefix,
              level,
              message: display(message),
              ...data,
              source: findSource(),
            }),
          )
        : undefined;

  const logger: Logger = {
    logAt,
    default: defaultLog,
    level: LEVEL.INFO,
    format: args.format ?? JSON.stringify,
    console: args.console ?? global.console,
    debug: logAt(LEVEL.DEBUG, "DEBUG", (l) => logger.console.debug(l)),
    info: logAt(LEVEL.INFO, "INFO", (l) => logger.console.info(l)),
    warn: logAt(LEVEL.WARN, "WARN", (l) => logger.console.warn(l)),
    error: logAt(LEVEL.ERROR, "ERR", (l) => logger.console.error(l)),
  };

  return logger as Logger;
}

export const DEFAULT_LOGGER = getLogger("default", {
  format: prettyLogFormatter(),
});

export function debug(message: Display, data?: object) {
  if (data) DEFAULT_LOGGER.debug(message, data);
  else DEFAULT_LOGGER.debug(message);
}

export function info(message: Display, data?: object) {
  if (data) DEFAULT_LOGGER.info(message, data);
  else DEFAULT_LOGGER.info(message);
}

export function warn(message: Display, data?: object) {
  if (data) DEFAULT_LOGGER.warn(message, data);
  else DEFAULT_LOGGER.warn(message);
}

export function error(message: Display, data?: object) {
  if (data) DEFAULT_LOGGER.error(message, data);
  else DEFAULT_LOGGER.error(message);
}
