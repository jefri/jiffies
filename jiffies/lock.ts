const locks = new WeakSet<Function>();

export function lock(fn: Function): Function {
  return function (...args: unknown[]) {
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
