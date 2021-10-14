import { makeHTMLLogger } from "../components/logger.js";
import { LEVEL } from "../log.js";
import {
  afterall,
  aftereach,
  beforeall,
  beforeeach,
  rootCases,
  getTotalCases,
} from "./describe.js";

let executedCases = 0;
let passedCases = 0;
let failedCases = 0;
/** @returns Promise<import("./scope").TestErrors> */
export async function execute(
  prefix = "",
  cases = rootCases(),
  /** @type import("./scope").TestErrors */ errors = {}
) {
  const beforeallfn = cases[beforeall] ?? (() => {});
  const beforeeachfn = cases[beforeeach] ?? (() => {});
  const afterallfn = cases[afterall] ?? (() => {});
  const aftereachfn = cases[aftereach] ?? (() => {});

  errors = errors[prefix] = {};

  try {
    await beforeallfn();
  } catch (e) {
    errors["_beforeAll"] = e;
    return;
  }
  for (const [title, block] of Object.entries(cases)) {
    if (typeof title === "symbol") continue;
    if (block instanceof Function) {
      try {
        executedCases += 1;
        await beforeeachfn();
        await block();
        await aftereachfn();
        passedCases += 1;
      } catch (e) {
        errors[title] = e;
        failedCases += 1;
      }
    } else if (block) {
      await execute(title, block, (errors[title] = {}));
    }
  }
  try {
    await afterallfn();
  } catch (e) {
    errors["_afterAll"] = e;
    return;
  }

  return errors;
}

export function getStatics() {
  return {
    totalCases: getTotalCases(),
    executedCases,
    passedCases,
    failedCases,
  };
}

/**
 * @param {import("./scope").TestErrors} errors
 * @returns {({test: string, stack?: string })[]}
 */
function prepareErrors(errors, prefix = "") {
  const errorList = [];
  for (const [title, err] of Object.entries(errors)) {
    if (typeof err == "string") {
      errorList.push({ test: `${prefix} ${title}`, stack: err });
    } else if (/** @type Error */ (err).message) {
      errorList.push({
        test: `${prefix} ${title}`,
        stack: /** @type Error */ (err).stack,
      });
    } else {
      errorList.push(
        ...prepareErrors(err, `${prefix}${prefix == "" ? "" : " -> "}${title}`)
      );
    }
  }
  return errorList;
}

export function makeStatistics(errors = {}) {
  const topLine = `Executed ${executedCases} of ${getTotalCases()}; ${failedCases} failed.`;

  return `${topLine}\n\n${prepareErrors(errors)
    .map(({ test, stack }) => `${test}\n${stack}`)
    .join("\n\n")}`;
}

export function displayStatistics(errors = {}, root = document.body) {
  const logger = makeHTMLLogger(
    `Executed ${executedCases} of ${getTotalCases()}; ${failedCases} failed.`
  );
  logger.level = LEVEL.DEBUG;
  for (const { test, stack } of prepareErrors(errors)) {
    logger.info(test);
    logger.debug(`${stack}`);
  }
  root.appendChild(logger.root);
}
