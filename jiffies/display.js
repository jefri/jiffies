/** @typedef {{ toString: () => string }} Display * /

/** @returns {a is Display} */
export const isDisplay = (/** @type unknown */ a) =>
  typeof (/** @type Display */ (a).toString) === "function";

/** @returns {string} */
export const display = (/** @type {unknown | Display} */ a) =>
  isDisplay(a) ? a.toString() : JSON.stringify(a);
