import { display, Display } from "./display.js";

export interface Log {
  (message: Display, data?: {}): void;
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
      fn: (message: Display, data?: {}) => void
    ): ((message: Display) => void) =>
    (message: Display, data?: {}) =>
      level >= (logger.level ?? LEVEL.SILENT)
        ? fn(display(message), data)
        : undefined;

  logger.debug = logAt(LEVEL.VERBOSE, console.debug.bind(console));
  logger.info = logAt(LEVEL.INFO, console.info.bind(console));
  logger.warn = logAt(LEVEL.WARN, console.warn.bind(console));
  logger.error = logAt(LEVEL.ERROR, console.error.bind(console));

  return logger as Logger;
}

export const DEFAULT_LOGGER = getLogger("default");

export function debug(message: Display, data?: {}) {
  DEFAULT_LOGGER.debug(message, data);
}

export function info(message: Display, data?: {}) {
  DEFAULT_LOGGER.info(message, data);
}

export function warn(message: Display, data?: {}) {
  DEFAULT_LOGGER.warn(message, data);
}

export function error(message: Display, data?: {}) {
  DEFAULT_LOGGER.error(message, data);
}
