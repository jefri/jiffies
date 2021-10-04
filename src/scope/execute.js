import { makeHTMLLogger } from "../components/html_logger.js";
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
/** @returns import("./scope").TestErrors */
export function execute(
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
    beforeallfn();
  } catch (e) {
    errors["_beforeAll"] = e;
    return;
  }
  for (const [title, block] of Object.entries(cases)) {
    if (typeof title === "symbol") continue;
    if (block instanceof Function) {
      try {
        executedCases += 1;
        beforeeachfn();
        block();
        aftereachfn();
        passedCases += 1;
      } catch (e) {
        errors[title] = e;
        failedCases += 1;
      }
    } else if (block) {
      execute(title, block, (errors[title] = {}));
    }
  }
  try {
    afterallfn();
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

function prepareErrors(errors, prefix = "") {
  const errorList = [];
  for (const [title, err] of Object.entries(errors)) {
    if (err.message) {
      errorList.push({ test: `${prefix} ${title}`, stack: err.stack });
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

export function displayStatistics(errors = {}) {
  const logger = makeHTMLLogger(
    `Executed ${executedCases} of ${getTotalCases()}; ${failedCases} failed.`
  );
  logger.level = LEVEL.DEBUG;
  for (const { test, stack } of prepareErrors(errors)) {
    logger.info(test);
    logger.debug(`${stack}`);
  }
  document.body.appendChild(logger.root);
}
