import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { equalArrays, equals, matchArrays } from "./equal.ts";

describe("Equality", () => {
  it("compares objects", () => {
    assert.strictEqual(equals({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
    assert.strictEqual(equals({ a: 1, b: 2 }, { b: 1, a: 2 }), false);
  });

  it("compares primitives", () => {
    assert.strictEqual(equals(1, 1), true);
    assert.strictEqual(equals(1, -1), false);
    assert.strictEqual(equals(0, -0), false);
    assert.strictEqual(equals(Number.NaN, Number.NaN), true);
  });

  it("compares arrays", () => {
    assert.strictEqual(equalArrays([1, 2, 3], [1, 2, 3]), true);
    assert.strictEqual(equalArrays([1], [2, 3]), false);
    assert.strictEqual(equalArrays([{ a: 1 }], [{ a: 1 }]), false);
    assert.strictEqual(matchArrays([{ a: 1 }], [{ a: 1 }]), true);
  });
});
