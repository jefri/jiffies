import { xml } from "../../dom/xml";
import { flattenResults } from "../execute.js";

/** @param {import("../execute.js").TestResult} results */
const cases = (results) =>
  Object.entries(results).filter(
    ([key]) => !["executed", "passed", "failed"].includes(key)
  );

/** @param {import("../execute.js").TestResult} results */
export function asXML(results) {
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
 * @param {import("../execute.js").FlatResult[]} cases
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
