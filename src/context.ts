import { Err, isResult, Ok, type Result } from "./result.ts";

export const Enter = Symbol("Context Enter");
export const Exit = Symbol("Context Exit");

export interface Context {
  [Enter]: () => void;
  [Exit]: () => void;
}

export type Operation<T, E extends Error, C extends Context> = (
  c: C,
) => T | Result<T, E>;

export type AsyncOperation<T, E extends Error, C extends Context> = (
  c: C,
) => Promise<T | Result<T, E>>;

export function using<T, E extends Error, C extends Context>(
  context: C | (() => C) | Operation<T, E, C>,
  operation?: Operation<T, E, C>,
  normalizeError: (e: Error | unknown) => Err<E> = (e) =>
    // @ts-expect-error
    Err(e),
): Result<T, E> {
  if (typeof context === "function") {
    if (context.length === 1) {
      operation = context as Operation<T, E, C>;
      context = {} as C;
    } else {
      context = (context as () => C)() as C;
    }
  }
  let result: Result<T, E>;
  try {
    context[Enter]();
    const op = operation?.(context);
    result = isResult(op as Result<T, E>) ? (op as Result<T, E>) : Ok(op as T);
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
  normalizeError: (e: E) => Err<E> = (e: E) => Err(e),
): Promise<Result<T, E>> {
  context = typeof context === "function" ? await context() : context;
  let result: Result<T, E>;
  try {
    context[Enter]();
    const op = await operation(context);
    result = isResult(op as Result<T, E>) ? (op as Result<T, E>) : Ok(op as T);
  } catch (e) {
    result = normalizeError(
      // @ts-expect-error
      e,
    );
  } finally {
    context[Exit]();
  }
  return result;
}
