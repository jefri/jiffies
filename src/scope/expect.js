import { assert } from "../assert.js";
import { equals } from "../equal.js";

/** @template T */
export class Matcher {
  constructor(/** @type T */ actual) {
    this.actual = actual;
  }

  toBe(/** @type T */ expected) {
    assert(this.actual === expected, () => `${this.actual} !== ${expected}`);
  }

  toEqual(/** @type T */ expected) {
    assert(
      equals(this.actual, expected),
      () =>
        `Objects are not equivalent: ${JSON.stringify(
          this.actual
        )}, ${JSON.stringify(expected)}`
    );
  }

  toMatchObject(/** @type Partial<T> */ expected) {
    for (const [k, v] of Object.entries(expected)) {
      assert(
        equals(this.actual[k], v),
        () =>
          `Comparing ${k}, properties not equal: ${JSON.stringify(
            this.actual[k]
          )}, ${JSON.stringify(v)}`
      );
    }
  }

  toBeNull() {
    assert(
      this.actual === null,
      () => `Expected null, got ${JSON.stringify(this.actual)}`
    );
  }

  toThrow(/** @type string= */ message = "") {
    let didThrow = false;

    /** @type unknown */
    let result = undefined;
    try {
      result = this.actual();
    } catch ({ message: e }) {
      assert(
        (e ?? "").match(message),
        () => `Expected thrown message to match ${message}, got ${e}`
      );
      didThrow = true;
    }

    assert(didThrow, () => `Expected throw but got ${JSON.stringify(result)}`);
  }
}

/**
 * @template T
 * @returns {Matcher<T>}
 */
export function expect(/** @type T */ t) {
  return new Matcher(t);
}
