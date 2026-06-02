import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diff } from "./diff.ts";

describe("diff", () => {
  it("diffs primitives", () => {
    const diffed = diff(1, 2);
    assert.deepStrictEqual(diffed, [{ key: "", left: 1, right: 2 }]);
  });

  it("diffs objects", () => {
    const diffed = diff({ a: 1, b: 2 }, { a: 2, b: 2 });
    assert.deepStrictEqual(diffed, [{ key: "a", left: 1, right: 2 }]);
  });

  it("diffs nested objects", () => {
    const diffed = diff({ a: { c: 1 }, b: 2 }, { a: { c: 2 }, b: 2 });
    assert.deepStrictEqual(diffed, [
      { key: "a", children: [{ key: "c", left: 1, right: 2 }] },
    ]);
  });

  it("diffs missing sides", () => {
    const diffed = diff<{ a?: number; b?: number }>({ a: 1 }, { b: 2 });
    assert.deepStrictEqual(diffed, [
      { key: "a", left: 1, right: undefined },
      { key: "b", left: undefined, right: 2 },
    ]);
  });

  it("diffs arrays", () => {
    const diffed = diff<number[]>([1, 2, 3], [1, 4, 3]);
    assert.deepStrictEqual(diffed, [{ key: 1, left: 2, right: 4 }]);
  });

  it("diffs objects in an array", () => {
    const diffed = diff(
      [{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }],
      [{ a: { b: 1 } }, { a: { b: 4 } }, { a: { b: 3 } }],
    );
    assert.deepStrictEqual(diffed, [
      {
        key: 1,
        children: [{ key: "a", children: [{ key: "b", left: 2, right: 4 }] }],
      },
    ]);
  });
});
