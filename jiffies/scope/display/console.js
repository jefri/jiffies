import { flattenResults } from "../execute.js";

/** @param {import("../execute.js").TestResult} results */
export function onConsole(results) {
  const { executed, failed, total } = results;
  console.log(`Executed ${executed} of ${total}; ${failed} failed.`);
  const flat = flattenResults(results);

  for (const { test } of flat) {
    console.log(`${test}`);
  }
  console.log();

  console.log("Failures:");
  for (const { test, stack } of flat) {
    if (stack) {
      console.log(test);
      console.log(`${stack}`);
    }
  }
}
