// const __locked: Symbol = Symbol('__locked');
const __locked: string = '__locked';
export function lock(fn: Function): Function {
  return function(...args: any[]) {
    let ret: any = null;
    let ex: any = null;
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
  }
}
