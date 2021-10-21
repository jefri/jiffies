#!/usr/bin/env node
import { xml } from "./jiffies/dom/xml.js";
import { parse } from "./jiffies/flags.js";
import { execute, flattenResults } from "./jiffies/scope/execute.js";

import * as all from "./jiffies/test_all.js";

(async function () {
  const results = await execute();

  const FLAGS = parse(process.argv);

  switch (FLAGS.asString("mode", "console")) {
    case "junit":
      const xml = asXML(results);
      console.log(xml);
      break;
    case "console":
    default:
      onConsole(results);
      break;
  }

  if (results.failed > 0) {
    process.exit(1);
  }
})();

/** @param {import("./jiffies/scope/execute.js").TestResult} results */
function onConsole(results) {
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

/** @param {import("./jiffies/scope/execute.js").TestResult} results */
const cases = (results) =>
  Object.entries(results).filter(
    ([key]) => !["executed", "passed", "failed"].includes(key)
  );

/** @param {import("./jiffies/scope/execute.js").TestResult} results */
function asXML(results) {
  return (
    `<?xml version="1.0" encoding="UTF-8" ?>` +
    xml(
      "testsuites",
      {
        tests: results.executed,
        failures: results.failed,
      },
      cases(results).map(([title, children]) =>
        testsuite(
          title,
          children.executed,
          children.failed,
          flattenResults(children)
        )
      )
    )
  );
}

/**
 * @param {string} name
 * @param {import("./jiffies/scope/execute.js").FlatResult[]} cases
 */
function testsuite(name, tests, failures, cases) {
  const id = name.replace("s+", "_");
  return xml(
    "testsuite",
    {
      id,
      name,
      tests,
      failures,
    },
    cases.map(({ test, stack }) =>
      testcase({ name: `${name} ${test}` }, stack ? [stack] : [])
    )
  );
}

function testcase(
  { name, id = name.replace(/\s+/g, "_"), time = "0.00" },
  failures
) {
  return xml(
    "testcase",
    { id, name, time },
    failures.map((stack) => failure({ text: stack }))
  );
}

function failure({ text, message = text.split("\n")[0] }) {
  return xml("failure", { message }, [`<![CDATA[${text}]]>`]);
}
