/**
 * @param {(...args: any[]) => void} fn
 * @param {number} ms = 32
 * @returns {(...args: unknown[]) => void}
 */
export function debounce(fn, ms = 32) {
	/** @type {ReturnType<typeof setTimeout>} */
	let timer;
	/** @param {any[]} args */
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => (clearTimeout(timer), fn(...args)), ms);
	};
}
