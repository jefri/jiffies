/** @typedef {import("../log.js").Logger} Logger */

import { div, span, ul, li, pre, code } from "../dom/html.ts";
import { LEVEL } from "../log.js";

/**
 * @typedef {Logger} HTMLLogger
 * @property {Element} root
 */

/** @returns {HTMLLogger} */
export function makeHTMLLogger(/** @type string */ name) {
  /** @type Element&(import ("../dom/dom.js").Updater<Element>) */ let log;
  const root = div(div(span(name)), (log = ul()));
  const logger = { level: LEVEL.INFO, root };

  /** @type HTMLLogger */

  /** @returns void */
  function append(/** @type string */ message) {
    log.appendChild(li(pre(code(message))));
  }

  /**
   *
   * @param {number} level
   * @returns {(message: unknown) => void}
   */
  const logAt =
    (level) =>
    /**
     *
     * @param {unknown} message
     * @returns void
     */
    (message) =>
      level >= (logger.level ?? LEVEL.ERROR) ? append(message) : undefined;

  logger.debug = logAt(LEVEL.VERBOSE);
  logger.info = logAt(LEVEL.INFO);
  logger.warn = logAt(LEVEL.WARN);
  logger.error = logAt(LEVEL.ERROR);

  return logger;
}
