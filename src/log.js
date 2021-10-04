/**
 * @typedef {(message: unknown) => void} Log
 * @typedef Logger
 * @property {number} level
 * @property {Log} debug
 * @property {Log} info
 * @property {Log} warn
 * @property {Log} error
 */

export const LEVEL = {
  UNKNOWN: 0,
  SILENT: 0,
  DEBUG: 1,
  VERBOSE: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

/** @returns {Logger} */
export function getLogger(/** @type  {string} */ name) {
  const /** @type Partial<Logger> */ logger = { level: LEVEL.INFO };

  /**
   *
   * @param {number} level
   * @param {(message: unknown) => void} fn
   * @returns {(message: unknown) => void}
   */
  const logAt =
    (level, fn) =>
    /**
     *
     * @param {unknown} message
     * @returns void
     */
    (message) =>
      level >= logger.level ? fn(message) : undefined;

  logger.debug = logAt(LEVEL.VERBOSE, console.debug.bind(console));
  logger.info = logAt(LEVEL.INFO, console.info.bind(console));
  logger.warn = logAt(LEVEL.WARN, console.warn.bind(console));
  logger.error = logAt(LEVEL.ERROR, console.error.bind(console));

  return /** @type Logger */ (logger);
}

export const DEFAULT_LOGGER = getLogger("default");

export function debug(/** @type unknown */ message) {
  DEFAULT_LOGGER.debug(message);
}

export function info(/** @type unknown */ message) {
  DEFAULT_LOGGER.info(message);
}

export function warn(/** @type unknown */ message) {
  DEFAULT_LOGGER.warn(message);
}

export function error(/** @type unknown */ message) {
  DEFAULT_LOGGER.error(message);
}
