import { display, Display } from "./display.js";

export interface Log {
  (message: Display, data?: {}): void;
}

export interface Logger {
  level: number;
  format: <
    D extends {
      name: string;
      prefix: string;
      level: number;
      message: string;
      source: string;
    }
  >(
    data: D
  ) => string;
  console: Console;
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
    LEVELS[level.toLowerCase()] ?? (!isNaN(+level) ? Number(level) : LEVEL.INFO)
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
  return err.stack?.split("\n")[3].split("(", 2)[1].slice(0, -1) ?? "(unknown)";
}

type LoggerFormatFn = <
  D extends {
    name: string;
    prefix: string;
    level: number;
    message: string;
    source: string;
  }
>(
  data: D
) => string;

export function getLogger(
  name: string,
  args: LoggerFormatFn | { format?: LoggerFormatFn; console?: Console } = {
    format: JSON.stringify,
    console,
  }
): Logger {
  if (args instanceof Function) {
    args = { format: args };
  }
  const logAt =
    (level: number, prefix: string, fn: (logLine: string) => void) =>
    (message: Display, data?: {}) =>
      level >= (logger.level ?? LEVEL.SILENT)
        ? fn(
            logger.format!({
              name,
              prefix,
              level,
              message: display(message),
              ...data,
              source: findSource(),
            })
          )
        : undefined;

  const logger: Logger = {
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

export const DEFAULT_LOGGER = getLogger("default");

export function debug(message: Display, data?: {}) {
  if (data) DEFAULT_LOGGER.debug(message, data);
  else DEFAULT_LOGGER.debug(message);
}

export function info(message: Display, data?: {}) {
  if (data) DEFAULT_LOGGER.info(message, data);
  else DEFAULT_LOGGER.info(message);
}

export function warn(message: Display, data?: {}) {
  if (data) DEFAULT_LOGGER.warn(message, data);
  else DEFAULT_LOGGER.warn(message);
}

export function error(message: Display, data?: {}) {
  if (data) DEFAULT_LOGGER.error(message, data);
  else DEFAULT_LOGGER.error(message);
}
