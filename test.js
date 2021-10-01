import { displayStatistics, execute } from "./src/scope/execute.js";
import { describe, expect, it } from "./src/scope/index.js";

import * as dom_html from "./src/dom/html.test.js";
import * as context from "./src/context.test.js";

describe("Test executor", () => {
  it("matches equality", () => {
    expect(1).toBe(1);
  });

  it("fails on inequality", () => {
    expect(1).toBe(2);
  });
});

const errors = execute();
displayStatistics(errors);
