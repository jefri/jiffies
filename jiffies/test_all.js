import { describe, expect, it } from "./scope/index.js";

import * as result from "./result.test.js";
import * as equal from "./equal.test.js";
import * as lock from "./lock.test.js";
import * as uuid from "./uuid.test.js";
import * as context from "./context.test.js";
import * as flags from "./flags.test.js";
import * as dom_html from "./dom/html.test.js";
import * as fc from "./dom/fc.test.js";
import * as virtualScroll from "./components/virtual_scroll.test.js";

describe("Test executor", () => {
  it("matches equality", () => {
    expect(1).toBe(1);
  });

  it("fails on inequality", () => {
    expect(() => expect(1).toBe(2)).toThrow();
  });
});
