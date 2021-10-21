/** @type {WeakSet<Function>} */
const locks = new WeakSet();

/**
 * @param {Function} fn
 * @returns {Function}
 */
export function lock(fn) {
  return function (/** @type unknown[] */ ...args) {
    let ret = null;
    let ex = null;
    if (!locks.has(fn)) {
      locks.add(fn);
      try {
        ret = fn(...args);
      } catch (e) {
        ex = e;
      }
    }
    locks.delete(fn);
    if (ex !== null) {
      throw ex;
    } else {
      return ret;
    }
  };
}
