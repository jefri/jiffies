/**
 * @template T
 * @param {import("./result").Option<T>} s
 * @returns {s is None} */
export const isNone = (s) => s == null;

/**
 * @template T
 * @param {import("./result").Option<T>} s
 * @returns {s is Some<T>} */
export const isSome = (s) => s != null;

/**
 * @template {unknown} T
 *
 * @param {import("./result").Option<T>=} s
 * @returns {import("./result").None}
 */
export function None(s) {
  return null;
}

// Beware: Order matters for correct inference.
/**
 * @template T
 *
 * @param {import("./result").Option<T>} s
 * @returns {T}
 *
 */ /**
 * @param {T} t
 * @returns {import("./result").Option<T>}
 */
export const Some = (t) => {
  return t ? t : None();
};

/**
 * @template T
 * @template {Error} E = Error
 * @param {import("./result").Result<T, E>} t
 * @returns {t is import("./result").Ok<T>}
 */
export const isOk = (t) => t.ok !== undefined;
/**
 * @template {Error} E
 * @param {import("./result").Result<unknown, E>} e
 * @returns {e is Err<E>}
 */
export const isErr = (e) => e.err !== undefined;
/**
 * @template T
 * @template {Error} E = Error
 * @param {import("./result").Result<T, E>} t
 * @returns {t is Result<T, E> }
 */
export const isResult = (t) => isOk(t) || isErr(t);

/**
 * @template T
 * @param {T|Ok<T>} t
 * @returns {import("./result").Ok<T>}
 */
export function Ok(t) {
  return t.ok ?? { ok: t };
}

/**
 * @template {Error} E
 * @param {E|import("./result").Err<E>|string} e
 * @returns {import("./result").Err<E>}
 */
export function Err(e) {
  return e.err ?? { err: typeof e === "string" ? new Error(e) : e };
}

/**
 * @template T
 * @template {Error} E
 * @param {import("./result").Option<T> | import("./result").Result<T, E>} t
 * @returns {T|never}
 */
export function unwrap(t) {
  if (isNone(t)) throw new Error(`Attempted to unwrap None`);
  if (isErr(t)) throw Err(t);
  if (isOk(t)) return Ok(t);
  return t;
}

/**
 * @template T
 * @template {Error} E
 * @param {import("./result").Option<T> | import("./result").Result<T, E>} t
 * @param {T} def
 * @returns {T|never}
 */
export function unwrapOr(t, def) {
  if (isNone(t)) return def;
  if (isErr(t)) return def;
  if (isOk(t)) return Ok(t);
  return t;
}

/**
 * @template T
 * @template {Error} E
 * @param {import("./result").Option<T> | import("./result").Result<T, E>} t
 * @param {() => T} def
 * @returns {T|never}
 */
export function unwrapOrElse(t, def) {
  if (isNone(t)) return def();
  if (isErr(t)) return def();
  if (isOk(t)) return Ok(t);
  return t;
}
