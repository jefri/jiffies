import { displayStatistics, execute } from "./src/scope/execute.js";
import { describe, expect, it } from "./src/scope/index.js";

import * as result from "./src/result.test.js";
import * as equal from "./src/equal.test.js";
import * as lock from "./src/lock.test.js";
import * as uuid from "./src/uuid.test.js";
import * as context from "./src/context.test.js";
import * as dom_html from "./src/dom/html.test.js";
import * as fc from "./src/dom/fc.test.js";
import * as virtualScroll from "./src/components/virtual_scroll.test.js";

describe("Test executor", () => {
  it("matches equality", () => {
    expect(1).toBe(1);
  });

  it("fails on inequality", () => {
    expect(() => expect(1).toBe(2)).toThrow();
  });
});

const root = document.getElementById("test_output") ?? undefined;

(async function test() {
  const errors = await execute();
  displayStatistics(errors, root);
})();
