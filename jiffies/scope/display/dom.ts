import { makeHTMLLogger } from "../../components/logger.js";
import { DEFAULT_LOGGER, LEVEL } from "../../log.js";
import { getTotalCases } from "../describe.js";
import { flattenResults, TestResult } from "../execute.js";

export function displayStatistics(results: TestResult, root = document.body) {
  const { executed, failed } = results;
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

  const flat = flattenResults(results);
  for (const { test, stack } of flat) {
    if (stack) {
      logger.info(test);
      logger.debug(`${stack}`);
    }
  }

  if (logger.root) {
    root.appendChild(logger.root);
  }
}
