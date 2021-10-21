import {
  afterall,
  aftereach,
  beforeall,
  beforeeach,
  rootCases,
} from "./describe.js";

/**
 * @typedef {import("./scope").TestCase} TestCase
 * @typedef {import("./scope").TestResult} TestResult
 */

/**
 * @param {string} prefix
 * @param {TestCase} cases
 * @returns {Promise<TestResult>}
 */
export async function execute(prefix = "", cases = rootCases()) {
  const beforeallfn = cases[beforeall] ?? (() => {});
  const beforeeachfn = cases[beforeeach] ?? (() => {});
  const afterallfn = cases[afterall] ?? (() => {});
  const aftereachfn = cases[aftereach] ?? (() => {});

  /** @type {TestResult} */
  const result = {
    executed: 0,
    passed: 0,
    failed: 0,
  };

  try {
    await beforeallfn();
  } catch (e) {
    result["_beforeAll"] = { error: /** @type {Error} */ (e) };
    return result;
  }

  for (const [title, block] of Object.entries(cases)) {
    if (typeof title === "symbol") continue;
    if (block instanceof Function) {
      try {
        result.executed += 1;
        await beforeeachfn();
        await block();
        await aftereachfn();
        result.passed += 1;
        result[title] = { passed: true };
      } catch (e) {
        result.failed += 1;
        result[title] = { error: /** @type Error */ e };
      }
    } else if (block) {
      const run = await execute(title, block);
      result.executed += run.executed;
      result.passed += run.passed;
      result.failed += run.failed;
      result[title] = run;
    }
  }

  try {
    await afterallfn();
  } catch (e) {
    result["_afterAll"] = { error: /** @type Error */ e };
  }

  return result;
}

/** @param {TestResult} error */
export function getError({ error }) {
  if (typeof error == "string") {
    return error;
  } else if (/** @type Error */ (error).message) {
    return /** @type Error */ (error).stack;
  } else {
    return "unknown error";
  }
}

/**
 * @typedef {{test: string, stack?: string, stats: {executed: number, failed: number} }} FlatResult
 * @param {import("./scope").TestResult} results
 * @returns {FlatResult[]}
 */
export function flattenResults(results, prefix = "") {
  const arrow = prefix == "" ? "" : " -> ";
  /** @type {FlatResult[]} */
  let errorList = [
    /*
    {
      test: prefix,
      stats: { executed: results.executed, failed: results.failed },
    },
    */
  ];
  for (const [title, result] of Object.entries(results).filter(
    ([key]) => !["executed", "passed", "failed"].includes(key)
  )) {
    const test = `${prefix}${arrow}${title}`;
    errorList = errorList.concat(
      result.error
        ? [{ test, stack: getError(result), stats: { executed: 1, failed: 1 } }]
        : result.passed === true
        ? [{ test: test, stats: { executed: 1, failed: 0 } }]
        : flattenResults(result, test)
    );
  }
  return errorList;
}
