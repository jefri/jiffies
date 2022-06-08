import {
  afterall,
  aftereach,
  beforeall,
  beforeeach,
  rootCases,
} from "./describe.js";
import { TestFailed, TestPassed, TestResult, TestSummary } from "./scope.js";

export async function execute(cases = rootCases()): Promise<TestResult> {
  const beforeallfn = cases[beforeall] ?? (() => {});
  const beforeeachfn = cases[beforeeach] ?? (() => {});
  const afterallfn = cases[afterall] ?? (() => {});
  const aftereachfn = cases[aftereach] ?? (() => {});

  const result: TestResult = { executed: 0, passed: 0, failed: 0, total: 0 };

  try {
    await beforeallfn();
  } catch (e) {
    result["_beforeAll"] = { error: e };
    return result;
  }

  for (const [title, block] of Object.entries(cases)) {
    if (typeof title === "symbol") {
      continue;
    }
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
      const run = await execute(block);
      result.executed += run.executed;
      result.passed += run.passed;
      result.failed += run.failed;
      result[title] = run;
    }
  }

  try {
    await afterallfn();
  } catch (e) {
    result["_afterAll"] = { error: e };
  }

  return result;
}

export function getError({ error }: TestResult) {
  if (typeof error == "string") {
    return error;
  } else if ((error as TestResult).message) {
    return (error as TestResult).stack;
  } else {
    return "unknown error";
  }
}

export interface FlatResult {
  test: string;
  stack?: string | number | TestResult | TestSummary;
  stats: { executed: number; failed: number };
}

function makeResult(
  test: string,
  result: TestResult | TestSummary
): FlatResult[] {
  if ((result as TestFailed).error)
    return [
      {
        test,
        stack: getError(result as TestResult),
        stats: { executed: 1, failed: 1 },
      },
    ];
  if ((result as TestPassed).passed === true) {
    return [{ test, stats: { executed: 1, failed: 0 } }];
  }
  return flattenResults(result as TestResult, test);
}

export function flattenResults(results: TestResult, prefix = ""): FlatResult[] {
  const arrow = prefix == "" ? "" : " -> ";
  let errorList: FlatResult[] = [];
  for (const [title, result] of Object.entries(results).filter(
    ([key]) => !["executed", "passed", "failed"].includes(key)
  )) {
    const test = `${prefix}${arrow}${title}`;
    if (typeof result == "number") continue;
    const flatResult = makeResult(test, result);
    errorList = errorList.concat(flatResult);
  }
  return errorList;
}
