// This file must be .js for imports to run. Unused imports in .ts files are
// discarded during transpilation.
import { describe, expect, it } from "./scope/index.js";

describe("Test executor", () => {
  it("matches equality", () => {
    expect(1).toBe(1);
  });

  it("fails on inequality", () => {
    expect(() => expect(1).toBe(2)).toThrow();
  });
});

import "./context.test.js";
import "./diff.test.js";
import "./equal.test.js";
import "./flags.test.js";
import "./fs.test.js";
import "./generator.test.js";
import "./lock.test.js";
import "./result.test.js";
import "./observable/observable.test.js";

import * as components from "./components/test";
import * as dom from "./dom/test";

(async () => {
  await components.loadTests();
  await dom.loadTests();
})();
