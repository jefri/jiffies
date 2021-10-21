import {
  afterall,
  aftereach,
  beforeall,
  beforeeach,
  rootCases,
  getTotalCases,
} from "./describe.js";

/**
 * @typedef {import("./scope").TestErrors} TestErrors
 *
 * @typedef {import("./scope").TestCase} TestCase
 *
 * @typedef TestRun
 * @property {TestErrors} errors
 * @property {number} executed
 * @property {number} passed
 * @property {number} failed
 */

/**
 * @param {string} prefix
 * @param {TestCase} cases
 * @param {TestErrors} errors
 * @returns {Promise<TestRun>}
 */

export async function execute(
  prefix = "",
  cases = rootCases(),
  /** @type import("./scope").TestErrors */ errors = {}
) {
  const beforeallfn = cases[beforeall] ?? (() => {});
  const beforeeachfn = cases[beforeeach] ?? (() => {});
  const afterallfn = cases[afterall] ?? (() => {});
  const aftereachfn = cases[aftereach] ?? (() => {});

  let executed = 0;
  let passed = 0;
  let failed = 0;

  errors = errors[prefix] = {};

  try {
    await beforeallfn();
  } catch (e) {
    errors["_beforeAll"] = e;
    return { executed, passed, failed, errors };
  }

  for (const [title, block] of Object.entries(cases)) {
    if (typeof title === "symbol") continue;
    if (block instanceof Function) {
      try {
        executed += 1;
        await beforeeachfn();
        await block();
        await aftereachfn();
        passed += 1;
      } catch (e) {
        errors[title] = e;
        failed += 1;
      }
    } else if (block) {
      const run = await execute(title, block, (errors[title] = {}));
      executed += run.executed;
      passed += run.passed;
      failed += run.failed;
    }
  }

  try {
    await afterallfn();
  } catch (e) {
    errors["_afterAll"] = e;
  }

  return {
    executed,
    passed,
    failed,
    errors,
  };
}

/**
 * @param {import("./scope").TestErrors} errors
 * @returns {({test: string, stack?: string })[]}
 */
export function prepareErrors(errors, prefix = "") {
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
