// Browser-only test aggregator. `src/index.html` imports this module to drive
// the in-page `scope` harness. The Node suite runs on `node --test` directly,
// so the per-file Node `*.test.ts` imports that used to live here are gone.
import { describe, expect, it } from "./scope/index.ts";

describe("Test executor", () => {
  it("matches equality", () => {
    expect(1).toBe(1);
  });

  it("fails on inequality", () => {
    expect(() => expect(1).toBe(2)).toThrow();
  });
});

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
