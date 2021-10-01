import { Err, isResult } from "./result.js";

export const Enter = Symbol("Context Enter");
export const Exit = Symbol("Context Exit");

/**
 * @exports
 * @typedef Context
 * @property {() => void} [Enter]
 * @property {() => void} [Exit]
 */

/**
 * @template T
 * @template {Error} E
 * @template {Context} C
 * @param {C|(() => C)} context
 * @param {(c: C) => T | import("./result.js").Result<T, Error>} operation
 * @param {(e: Error | unknown | any) => Err<E>} normalizeError
 * @returns {import("./result.js").Result<T, E>}
 */
export function using(
  context,
  operation,
  normalizeError = (e) => Err(/** @type E */ (e))
) {
  context = typeof context == "function" ? context() : context;
  let /** @type import("./result.js").Result<T, Error> */ result;
  try {
    context[Enter]();
    const op = operation(context);
    result = isResult(op) ? op : Ok(op);
  } catch (e) {
    result = normalizeError(e);
  } finally {
    context[Exit]();
  }
  return result;
}

/**
 * @template T
 * @template {Error} E
 * @template {Context} C
 * @param {C | (() => Promise<C>)} context
 * @param {(c: C) => Promise<T | import("./result.js").Result<T, E>>} operation
 * @param {(e: Error|unknown|any) => Err<E>} normalizeError
 * @returns {Promise<import("./result.js").Result<T, Error>>}
 */
export async function asyncUsing(
  context,
  operation,
  normalizeError = (e) => Err(/** @type E */ (e))
) {
  context = typeof context == "function" ? await context() : context;
  let /** @type import("./result.js").Result<T, E> */ result;
  try {
    context[Enter]();
    const op = await operation(context);
    result = isResult(op) ? op : Ok(op);
  } catch (e) {
    result = normalizeError(e);
  } finally {
    context[Exit]();
  }
  return result;
}