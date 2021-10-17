/**
 * @typedef {{ toString: () => string }} Display
 * /

/**
 * @param {unknown} a
 * @returns {a is Display}
 */
export const isDisplay = (a) =>
  typeof (/** @type Display */ (a).toString) === "function";

/**
 *
 * @param {unknown | Display} a
 * @returns {string}
 */
export const display = (a) => (isDisplay(a) ? a.toString() : JSON.stringify(a));
