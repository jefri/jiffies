const __locked = Symbol("__locked");
/**
 *
 * @param {Function} fn
 * @returns {Function}
 */
export function lock(fn) {
  return function (/** @type unknown[] */ ...args) {
    let ret = null;
    let ex = null;
    if (fn[__locked] !== true) {
      fn[__locked] = true;
      try {
        ret = fn.apply(this, args);
      } catch (e) {
        ex = e;
      }
    }
    fn[__locked] = false;
    if (ex !== null) {
      throw ex;
    } else {
      return ret;
    }
  };
}
