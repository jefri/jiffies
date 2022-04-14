import { xml } from "../../dom/xml.js";
import { FlatResult, flattenResults } from "../execute.js";
import { TestResult } from "../scope.js";

const cases = (results: TestResult) =>
  Object.entries(results).filter(
    ([key]) => !["executed", "passed", "failed"].includes(key)
  );

export function asXML(results: TestResult) {
  return (
    `<?xml version="1.0" encoding="UTF-8" ?>` +
    xml(
      "testsuites",
      { tests: results.executed, failures: results.failed },
      cases(results).map(([title, children]) =>
        testsuite(
          title,
          (children as TestResult).executed,
          (children as TestResult).failed,
          flattenResults(children as TestResult)
        )
      )
    )
  );
}

function testsuite(
  name: string,
  tests: number,
  failures: number,
  cases: FlatResult[]
) {
  const id = name.replace("s+", "_");
  return xml(
    "testsuite",
    { id, name, tests, failures },
    cases.map(({ test, stack }) =>
      testcase({ name: `${name} ${test}` }, stack ? [stack] : [])
    )
  );
}

function testcase(
  {
    name,
    id = name.replace(/\s+/g, "_"),
    time = "0.00",
  }: { name: string; id?: string; time?: string },
  failures: string[]
) {
  return xml(
    "testcase",
    { id, name, time },
    failures.map((stack) => failure({ text: stack }))
  );
}

function failure({
  text,
  message = text.split("\n")[0],
}: {
  text: string;
  message?: string;
}) {
  return xml("failure", { message }, [`<![CDATA[${text}]]>`]);
}
