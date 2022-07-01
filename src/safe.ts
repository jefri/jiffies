import { error } from "./log"

export const safe =
  <A extends unknown[], R>(fn: (...args: A) => R, r: R): ((...args: A) => R) =>
  (...args: A) => {
    try {
      return fn(...args);
    } catch (e: unknown) {
      error(`${e}`);
      return r;
    }
  };
