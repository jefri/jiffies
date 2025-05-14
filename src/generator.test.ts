import { takeWhile } from "./generator.js";
import { describe, expect, it } from "./scope/index.js";

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
    expect(values).toEqual([2, 4, 8, 16, 32, 64, 128]);
  });
});
