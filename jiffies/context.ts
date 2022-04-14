import { Ok, Err, isResult, Result } from "./result.js";

export const Enter = Symbol("Context Enter");
export const Exit = Symbol("Context Exit");

export interface Context {
  [Enter]: () => void;
  [Exit]: () => void;
}

export interface Operation<T, E extends Error, C extends Context> {
  (c: C): T | Result<T, E>;
}

export interface AsyncOperation<T, E extends Error, C extends Context> {
  (c: C): Promise<T | Result<T, E>>;
}

export function using<T, E extends Error, C extends Context>(
  context: C | (() => C) | Operation<T, E, C>,
  operation?: Operation<T, E, C>,
  normalizeError: (e: Error | unknown | any) => Err<E> = (e) =>
    Err(/** @type E */ e)
): Result<T, E> {
  if (typeof context == "function") {
    if (context.length == 1) {
      operation = context as Operation<T, E, C>;
      context = {} as C;
    } else {
      context = (context as () => C)() as C;
    }
  }
  let result;
  try {
    context[Enter]();
    const op = operation!(context);
    result = isResult(op) ? op : Ok(op);
  } catch (e) {
    result = normalizeError(e);
  } finally {
    context[Exit]();
  }
  return result;
}

export async function asyncUsing<T, E extends Error, C extends Context>(
  context: C | (() => Promise<C>),
  operation: AsyncOperation<T, E, C>,
  normalizeError: (e: Error | unknown | any) => Err<E> = (e: E) => Err(e)
): Promise<Result<T, E>> {
  context = typeof context == "function" ? await context() : context;
  let result;
  /** @type import("./result.js").Result<T, E> */
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
