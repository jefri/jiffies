// This file must be .js for imports to run. Unused imports in .ts files are
// discarded during transpilation.
import { describe, expect, it } from "./scope/index.ts";

describe("Test executor", () => {
  it("matches equality", () => {
    expect(1).toBe(1);
  });

  it("fails on inequality", () => {
    expect(() => expect(1).toBe(2)).toThrow();
  });
});

import "./context.test.ts";
import "./diff.test.ts";
import "./equal.test.ts";
import "./flags.test.ts";
import "./fs.test.ts";
import "./generator.test.ts";
import "./lock.test.ts";
import "./result.test.ts";
import "./observable/observable.test.ts";
import "./server/main.test.ts";

if (
  typeof process !== "undefined" &&
  process.env.CI?.toLowerCase() !== "true"
) {
  (async () => {
    const components = await import("./components/test.ts");
    const dom = await import("./dom/test.ts");
    await components.loadTests();
    await dom.loadTests();
  })();
}
