import { displayStatistics, execute } from "./src/scope/execute.js";
import { describe, expect, it } from "./src/scope/index.js";

import * as dom_html from "./src/dom/html.test.js";
import * as context from "./src/context.test.js";
import * as result from "./src/result.test.js";
import * as fc from "./src/dom/fc.test.js";

describe("Test executor", () => {
  it("matches equality", () => {
    expect(1).toBe(1);
  });

  it("fails on inequality", () => {
    expect(() => expect(1).toBe(2)).toThrow();
  });
});

(async function test() {
  const errors = await execute();
  displayStatistics(errors);
})();
