const locks = new WeakSet<CallableFunction>();

export function lock<CF extends (...args: unknown[]) => unknown>(fn: CF): CF {
  const lockingFn: CF = (...args: Parameters<CF>): ReturnType<CF> => {
    let ret: ReturnType<CF>;
    let ex = null;
    if (!locks.has(fn)) {
      locks.add(fn);
      try {
        ret = fn(...args) as ReturnType<CF>;
      } catch (e) {
        ex = e;
      }
    }
    locks.delete(fn);
    if (ex !== null) {
      throw ex;
    }
    // @ts-ignore 2454 can't track ret's assignment
    return ret;
  };
  return lockingFn;
}
