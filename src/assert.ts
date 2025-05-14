type AssertMessage = string | (() => string);

export class AssertionError extends Error {
  constructor(message = "Assertion failed") {
    super(message);
  }
}

/**
 * Throw an error when a condition is not met.
 */
export function assert<_T extends true>(
  condition: boolean,
  message?: AssertMessage,
): undefined | never {
  if (!condition) {
    throw new AssertionError(message instanceof Function ? message() : message);
  }
}

/**
 * Given a value, return it if it is not null nor undefined. Otherwise throw an
 * error.
 *
 * @template T
 * @returns {NonNullable<T>}
 */
export function assertExists<T>(
  t: T,
  message: AssertMessage = "Assertion failed: value does not exist",
): NonNullable<T> {
  assert(t != null, message);
  return t as NonNullable<T>;
}

/**
 * @param {*} n
 * @returns string
 */
export function assertString(
  n: unknown,
  message: AssertMessage = () => `Assertion failed: ${n} is not a string`,
): string {
  assert(typeof n === "string", message);
  return n as string;
}

/**
 * Compile time assertion that no value will used at this point in control flow.
 */
export function checkExhaustive(
  value: never,
  message: AssertMessage = `Unexpected value ${value}`,
): never {
  throw new Error(message instanceof Function ? message() : message);
}
