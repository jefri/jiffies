/**
 * Given a value with numbers, attempt to fix all numbers to 1 decimal point.
 *
 * @template {unknown} T
 * @param {T} n
 * @returns {T}
 */
export function fix(n) {
	if (typeof n === "number") {
		return (+n.toFixed(1)); /** @type T */
	}
	if (n !== Object(n)) {
		// A primitive
		return n;
	}
	if (n instanceof Array) {
		return (n.map(fix)); /** @type T */
	}
	return (
		/** @type T*/
		/** @type unknown */ mapreduce(
			fix,
			/** @type Record<string, unknown> */ (n),
		)
	);
}

/**
 *
 * @param {(t: unknown) => unknown} fn
 * @param {Record<string, unknown>} iter
 * @returns Record<string, unknown>
 */
function mapreduce(fn, iter) {
	return Object
		.entries(iter)
		.reduce(
			(acc, [k, v]) => ((acc[k] = fn(v)), acc),
			/** @type Record<string, unknown>*/ ({}),
		);
}
