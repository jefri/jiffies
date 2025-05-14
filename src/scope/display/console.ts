import { getLogger } from "../../log.ts";
import { getTotalCases } from "../describe.ts";
import { flattenResults } from "../execute.ts";
import type { TestResult } from "../scope.ts";

const logger = getLogger("Scope Test Runner");

export function onConsole(results: TestResult) {
  const { executed, failed } = results;
  logger.info("Executed test suite.", {
    executed,
    total: getTotalCases(),
    failed,
  });
  const flat = flattenResults(results);

  for (const { test } of flat) {
    logger.debug(test);
  }

  for (const { test, stack } of flat) {
    if (stack) {
      logger.error(test, { stack });
    }
  }
}
