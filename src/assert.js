/**
 * Throw an error when a condition is not met.
 * @returns {void|never}
 */
export function assert(
  /** @type boolean */ condition,
  /** @type string|(() => string) */ message = "Assertion failed"
) {
  if (!condition)
    throw new Error(message instanceof Function ? message() : message);
}

/**
 * Given a value, return it if it is not null nor undefined. Otherwise throw an
 * error.
 *
 * @template T
 * @returns {NonNullable<T>}
 */
export function assertExists(
  /** @type T */ t,
  message = "Assertion failed: value does not exist"
) {
  assert(t != null, message);
  return t;
}

/**
 * Compile time assertion that no value will used at this point in control flow.
 *
 * @returns {never}
 */
export function checkExhaustive(
  /** @type never */ value,
  message = `Unexpected value ${value}`
) {
  throw new Error(message);
}
