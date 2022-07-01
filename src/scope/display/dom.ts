import { isHTMLLogger, makeHTMLLogger } from "../../components/logger"
import { DOMElement } from "../../dom/dom"
import { DEFAULT_LOGGER, LEVEL } from "../../log"
import { getTotalCases } from "../describe"
import { flattenResults } from "../execute"
import { TestResult } from "../scope"

export function displayStatistics(
  results: TestResult,
  root: DOMElement = document.body as DOMElement
) {
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

  if (isHTMLLogger(logger)) {
    root.appendChild(logger.root);
  }
}
