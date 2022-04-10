export interface Log {
  (message: unknown): void;
}

export interface Logger {
  level: Number;
  debug: Log;
  info: Log;
  warn: Log;
  error: Log;
}

export const LEVEL = {
  UNKNOWN: 0,
  SILENT: 0,
  DEBUG: 1,
  VERBOSE: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

export function getLogger(name: string): Logger {
  const logger: Partial<Logger> = { level: LEVEL.INFO };
  const logAt =
    (
      level: number,
      fn: (message: unknown) => void
    ): ((message: unknown) => void) =>
    (message: unknown) =>
      level >= (logger.level ?? LEVEL.SILENT) ? fn(message) : undefined;

  logger.debug = logAt(LEVEL.VERBOSE, console.debug.bind(console));
  logger.info = logAt(LEVEL.INFO, console.info.bind(console));
  logger.warn = logAt(LEVEL.WARN, console.warn.bind(console));
  logger.error = logAt(LEVEL.ERROR, console.error.bind(console));

  return logger as Logger;
}

export const DEFAULT_LOGGER = getLogger("default");

export function debug(message: unknown) {
  DEFAULT_LOGGER.debug(message);
}

export function info(message: unknown) {
  DEFAULT_LOGGER.info(message);
}

export function warn(message: unknown) {
  DEFAULT_LOGGER.warn(message);
}

export function error(message: unknown) {
  DEFAULT_LOGGER.error(message);
}
