import { assert } from "../assert.js"
import { display } from "../display.js"
import { equals } from "../equal.js"

export class Matcher<T> {
  actual: T;
  constructor(actual: T) {
    this.actual = actual;
  }

  get not(): Matcher<T> {
    return new NotMatcher(this.actual);
  }

  toBe(expected: T) {
    assert(this.actual === expected, () => `${this.actual} !== ${expected}`);
  }

  toEqual(expected: T, partial = false) {
    assert(
      equals(this.actual, expected, partial),
      () =>
        `Objects are not equivalent: ${display(this.actual)}, ${display(
          expected
        )}`
    );
  }

  toMatch(expected: RegExp | string) {
    assert(
      typeof this.actual === "string",
      () => "Must have string for regexp match"
    );
    // @ts-expect-error
    const actual: string = this.actual;
    if (typeof expected === "string") {
      assert(
        actual.includes(expected),
        () => `${actual} does not include ${expected}`
      );
    } else {
      assert(
        expected.test(actual),
        () => `${actual} does not match ${expected}`
      );
    }
  }

  toMatchObject(expected: Partial<T>) {
    for (const [k, v] of Object.entries(expected)) {
      // @ts-expect-error
      const actual: Partial<T> = this.actual[k];
      assert(
        equals(actual, v, true),
        () =>
          `Comparing ${k}, properties not equal: ${display(actual)}, ${display(
            v
          )}`
      );
    }
  }

  toBeNull() {
    assert(
      this.actual === null,
      () => `Expected null, got ${JSON.stringify(this.actual)}`
    );
  }

  toThrow(message = "") {
    let didThrow = false;

    let result: unknown = undefined;
    try {
      // @ts-expect-error
      result = this.actual();
    } catch ({ message: e }) {
      assert(
        // @ts-expect-error
        (e ?? "").match(message),
        () => `Expected thrown message to match ${message}, got ${e}`
      );
      didThrow = true;
    }

    assert(didThrow, () => `Expected throw but got ${JSON.stringify(result)}`);
  }
}

export class NotMatcher<T> {
  actual: T;
  constructor(actual: T) {
    this.actual = actual;
  }

  get not(): Matcher<T> {
    return new Matcher(this.actual);
  }

  toBe(expected: T) {
    assert(this.actual !== expected, () => `${this.actual} === ${expected}`);
  }

  toEqual(expected: T) {
    assert(
      !equals(this.actual, expected),
      () =>
        `Objects are equivalent: ${JSON.stringify(
          this.actual
        )}, ${JSON.stringify(expected)}`
    );
  }

  toMatch(expected: RegExp | string) {
    assert(
      typeof this.actual === "string",
      () => "Must have string for regexp match"
    );
    // @ts-expect-error
    const actual: string = this.actual;
    if (typeof expected === "string") {
      assert(
        !actual.includes(expected),
        () => `${actual} includes ${expected}`
      );
    } else {
      assert(!expected.test(actual), () => `${actual} matches ${expected}`);
    }
  }

  toMatchObject(expected: Partial<T>) {
    for (const [k, v] of Object.entries(expected)) {
      // @ts-expect-error
      const actual = this.actual[k];
      assert(
        !equals(actual, v),
        () =>
          `Comparing ${k}, properties equal: ${JSON.stringify(
            actual
          )}, ${JSON.stringify(v)}`
      );
    }
  }

  toBeNull() {
    assert(this.actual !== null, () => `Expected not null`);
  }

  toThrow(message = "") {
    let didThrow = false;

    let result: unknown = undefined;
    try {
      // @ts-expect-error
      result = this.actual();
    } catch ({ message: e }) {
      assert(
        // @ts-expect-error
        (e ?? "").match(message),
        () => `Expected thrown message to match ${message}, got ${e}`
      );
      didThrow = true;
    }

    assert(!didThrow, () => `Expected throw but got ${JSON.stringify(result)}`);
  }
}

export function expect<T>(t: T): Matcher<T> {
  return new Matcher(t);
}
