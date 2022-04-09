import { assert } from "../assert.js";
import { equals } from "../equal.js";

/** @template T */
export class Matcher {
	constructor( /** @type T */ actual) {
		this.actual = actual;
	}

	/** @returns {Matcher<T>} */
	get not() {
		return new NotMatcher(this.actual);
	}

	toBe( /** @type T */ expected) {
		assert(this.actual === expected, () => `${this.actual} !== ${expected}`);
	}

	toEqual( /** @type T */ expected) {
		assert(
			equals(this.actual, expected),
			() =>
				`Objects are not equivalent: ${JSON.stringify(this.actual)}, ${JSON.stringify(
					expected,
				)}`,
		);
	}

	toMatch( /** @type {RegExp|string} */ expected) {
		assert(
			typeof this.actual === "string",
			() => "Must have string for regexp match",
		);
		// @ts-expect-error
		const actual = /** @type string */ (this.actual);
		if (typeof expected === "string") {
			assert(
				actual.includes(expected),
				() => `${actual} does not include ${expected}`,
			);
		} else {
			assert(
				expected.test(actual),
				() => `${actual} does not match ${expected}`,
			);
		}
	}

	toMatchObject( /** @type Partial<T> */ expected) {
		for (const [k, v] of Object.entries(expected)) {
			// @ts-expect-error
			const actual = this.actual[k];
			assert(
				equals(actual, v),
				() =>
					`Comparing ${k}, properties not equal: ${JSON.stringify(actual)}, ${JSON.stringify(
						v,
					)}`,
			);
		}
	}

	toBeNull() {
		assert(
			this.actual === null,
			() => `Expected null, got ${JSON.stringify(this.actual)}`,
		);
	}

	toThrow( /** @type string= */ message = "") {
		let didThrow = false;

		/** @type unknown */
		let result = undefined;
		try {
			// @ts-expect-error
			result = this.actual();
		} catch ({ message: e }) {
			assert(
				// @ts-expect-error
				(e ?? "").match(message),
				() => `Expected thrown message to match ${message}, got ${e}`,
			);
			didThrow = true;
		}

		assert(didThrow, () => `Expected throw but got ${JSON.stringify(result)}`);
	}
}

/** @template T */
export class NotMatcher {
	constructor( /** @type T */ actual) {
		this.actual = actual;
	}

	/** @returns {Matcher<T>} */
	get not() {
		return new Matcher(this.actual);
	}

	toBe( /** @type T */ expected) {
		assert(this.actual !== expected, () => `${this.actual} === ${expected}`);
	}

	toEqual( /** @type T */ expected) {
		assert(
			!equals(this.actual, expected),
			() =>
				`Objects are equivalent: ${JSON.stringify(this.actual)}, ${JSON.stringify(
					expected,
				)}`,
		);
	}

	toMatch( /** @type {RegExp|string} */ expected) {
		assert(
			typeof this.actual === "string",
			() => "Must have string for regexp match",
		);
		// @ts-expect-error
		const actual = /** @type string */ (this.actual);
		if (typeof expected === "string") {
			assert(!actual.includes(expected), () => `${actual} includes ${expected}`);
		} else {
			assert(!expected.test(actual), () => `${actual} matches ${expected}`);
		}
	}

	toMatchObject( /** @type Partial<T> */ expected) {
		for (const [k, v] of Object.entries(expected)) {
			// @ts-expect-error
			const actual = this.actual[k];
			assert(
				!equals(actual, v),
				() =>
					`Comparing ${k}, properties equal: ${JSON.stringify(actual)}, ${JSON.stringify(
						v,
					)}`,
			);
		}
	}

	toBeNull() {
		assert(this.actual !== null, () => `Expected not null`);
	}

	toThrow( /** @type string= */ message = "") {
		let didThrow = false;

		/** @type unknown */
		let result = undefined;
		try {
			// @ts-expect-error
			result = this.actual();
		} catch ({ message: e }) {
			assert(
				// @ts-expect-error
				(e ?? "").match(message),
				() => `Expected thrown message to match ${message}, got ${e}`,
			);
			didThrow = true;
		}

		assert(!didThrow, () => `Expected throw but got ${JSON.stringify(result)}`);
	}
}

/**
 * @template T
 * @returns {Matcher<T>}
 */
export function expect( /** @type T */ t) {
	return new Matcher(t);
}
