import { displayStatistics, execute } from "./jiffies/scope/execute.js";
import { describe, expect, it } from "./jiffies/scope/index.js";

import * as result from "./jiffies/result.test.js";
import * as equal from "./jiffies/equal.test.js";
import * as lock from "./jiffies/lock.test.js";
import * as uuid from "./jiffies/uuid.test.js";
import * as context from "./jiffies/context.test.js";
import * as dom_html from "./jiffies/dom/html.test.js";
import * as fc from "./jiffies/dom/fc.test.js";
import * as virtualScroll from "./jiffies/components/virtual_scroll.test.js";

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
