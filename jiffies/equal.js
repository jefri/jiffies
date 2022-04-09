/**
 * @template {unknown} T
 * @param {(a: T, b: T) => boolean } equal
 * @returns {(A: T[], b: T[]) => boolean}
 */
export const compareArrays = (equal) =>
/**
   * @param {T[]} a
   * @param {T[]} b
   * @returns boolean
   */
(a, b) => a.length === b.length && a.every((e, i) => equal(e, b[i]));

export const equalArrays = compareArrays(Object.is);

export const matchArrays = compareArrays(equals); /** @type <A>(A: A[], b: A[]) => boolean */

/** @returns ([string, unknown])[] */
function asArray( /** @type Record<string, unknown> */ a) {
	return Object.entries(a).sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * @template A
 * @param {A} a
 * @param {A} b
 * @returns boolean
 */
export function equals(a, b) {
	// runtime type checking
	switch (typeof a) {
		case "object":
			if (a instanceof Array) {
				// eslint-disable-next-line
				return matchArrays(a, /** @type any */ (b));
			} else {
				// eslint-disable-next-line
				return matchArrays(
					asArray( /** @type any */ (a)),
					asArray( /** @type any */ (b)),
				);
			}
		default:
			return Object.is(a, b);
	}
}
