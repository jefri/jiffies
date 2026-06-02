import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { takeWhile } from "./generator.ts";

describe("Generator", () => {
  it("takes from a generator until a predicate", () => {
    const generator = function* () {
      let i = 1;
      while (true) {
        i = i * 2;
        yield i;
      }
    };
    const filter = () => {
      let previousValue = 0;
      return (n: number) => {
        if (previousValue < 100) {
          previousValue = n;
          return true;
        }
        return false;
      };
    };

    const values = [...takeWhile(filter(), generator())];
    assert.deepStrictEqual(values, [2, 4, 8, 16, 32, 64, 128]);
  });
});
