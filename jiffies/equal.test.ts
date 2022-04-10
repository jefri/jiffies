import { describe, it, expect } from "./scope/index.js";
import { equalArrays, equals, matchArrays } from "./equal.js";

describe("Equality", () => {
  it("compares objects", () => {
    expect(equals({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(equals({ a: 1, b: 2 }, { b: 1, a: 2 })).toBe(false);
  });

  it("compares primitives", () => {
    expect(equals(1, 1)).toBe(true);
    expect(equals(1, -1)).toBe(false);
    expect(equals(0, -0)).toBe(false);
    expect(equals(NaN, NaN)).toBe(true);
  });

  it("compares arrays", () => {
    expect(equalArrays([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(equalArrays([1], [2, 3])).toBe(false);
    expect(equalArrays([{ a: 1 }], [{ a: 1 }])).toBe(false);
    expect(matchArrays([{ a: 1 }], [{ a: 1 }])).toBe(true);
  });
});
