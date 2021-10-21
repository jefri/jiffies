import { makeHTMLLogger } from "../components/logger.js";
import { DEFAULT_LOGGER, LEVEL } from "../log.js";
import { getTotalCases } from "./describe.js";
import { prepareErrors } from "./execute.js";

/** @param import("./execute.js").TestRun} run */
export function displayStatistics(
  { executed, failed, errors },
  root = document.body
) {
  const logger = (() => {
    try {
      return makeHTMLLogger(
        `Executed ${executed} of ${getTotalCases()}; ${failed} failed.`
      );
    } catch (e) {
      return DEFAULT_LOGGER;
    }
  })();
  logger.level = LEVEL.DEBUG;
  for (const { test, stack } of prepareErrors(errors)) {
    logger.info(test);
    logger.debug(`${stack}`);
  }
  if (logger.root) {
    root.appendChild(logger.root);
  }
}
