export type None = null;
export type Some<T> = T;
export type Option<T> = Some<T> | None;
export type Err<E extends Error> = { err: E };
export type Ok<T> = { ok: T };
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

export const isNone = <T>(s: Option<T>): s is None => s == null;
export const isSome = <T>(s: Option<T>): s is Some<T> => s != null;

export function None<T = unknown>(_?: T): Option<T> {
  return null;
}

export function Some<T>(t: Option<T>): Option<T>;
export function Some<T>(t: T): Option<T>;
export function Some(t: any): any {
  return t;
}

export const isOk = <T, E extends Error>(t: Result<T, E>): t is Ok<T> =>
  (t as Ok<T>).ok !== undefined;
export const isErr = <T, E extends Error>(e: Result<T, E>) =>
  (e as Err<E>).err !== undefined;
export const isResult = <T, E extends Error>(
  t: Result<T, E>
): t is Result<T, E> => isOk(t) || isErr(t);

// Beware: Order matters for correct inference.
export function Ok<T>(ok: Ok<T>): T;
export function Ok<T>(t: T): Ok<T>;
export function Ok(t: any): any {
  return t.ok ? t.ok : { ok: t };
}

// Beware: Order matters for correct inference.
export function Err<E extends Error>(e: Err<E>): E;
export function Err<E extends Error>(e: E): Err<E>;
export function Err<E extends Error>(e: string): Err<E>;
export function Err(e: any): any {
  return e.err ?? { err: typeof e === "string" ? new Error(e) : e };
}

export function unwrap<T, E extends Error>(result: Result<T, E>): T | never;
export function unwrap<O>(some: Option<O>): O | never;
export function unwrap(t: any): any {
  if (isNone(t)) {
    throw new Error(`Attempted to unwrap None`);
  }
  if (isErr(t)) {
    throw Err(t);
  }
  if (isOk(t)) {
    return Ok(t);
  }
  return t;
}

export function unwrapOr<T, E extends Error>(result: Result<T, E>, def: T): T;
export function unwrapOr<T>(some: Some<T>, def: T): T;
export function unwrapOr(t: any, def: any): any {
  if (isNone(t)) {
    return def;
  }
  if (isErr(t)) {
    return def;
  }
  if (isOk(t)) {
    return Ok(t);
  }
  return t;
}

export function unwrapOrElse<T, E extends Error>(
  result: Result<T, Error>,
  def: () => T
): T;
export function unwrapOrElse<T>(some: Some<T>, def: () => T): T;
export function unwrapOrElse(t: any, def: any): any {
  if (isNone(t)) {
    return def();
  }
  if (isErr(t)) {
    return def();
  }
  if (isOk(t)) {
    return Ok(t);
  }
  return t;
}
