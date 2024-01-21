export type None = null;
export type Some<T> = T;
export type Option<T> = Some<T> | None;
export type Err<E = Error> = {
  err: E;
  map: <U>(fn: (t: unknown) => Result<U>) => Result<U>;
};
export type Ok<T> = { ok: T; map: <U>(fn: (t: T) => Result<U>) => Result<U> };
export type Result<T, E = Error> = Ok<T> | Err<E>;

export const isNone = <T>(s: Option<T>): s is None => s === null;
export const isSome = <T>(s: Option<T>): s is Some<T> => s != null;

export function None<T = unknown>(_?: T): Option<T> {
  return null;
}

export function Some<T>(t: Option<T>): Option<T>;
export function Some<T>(t: T): Option<T>;
export function Some(t: any): any {
  return t;
}

export const isOk = <T, E>(t: Result<T, E>): t is Ok<T> =>
  Object.prototype.hasOwnProperty.call(t ?? {}, "ok");
export const isErr = <T, E>(e: Result<T, E>): e is Err<E> =>
  Object.prototype.hasOwnProperty.call(e, "err");
export const isResult = <T, E>(t: Result<T, E>): t is Result<T, E> =>
  isOk(t) || isErr(t);

// Beware: Order matters for correct inference.
export function Ok<T>(ok: Ok<T>): T;
export function Ok<T>(t?: T): Ok<T>;
export function Ok<T, E>(t: any): any {
  return isOk(t)
    ? t.ok
    : {
        ok: t,
        map<U>(fn: (_: typeof t) => Result<U, E>): Result<U, E> {
          return fn(Ok(this));
        },
      };
}

// Beware: Order matters for correct inference.
export function Err<E>(e: Err<E>): E;
export function Err<E>(e: E): Err<E>;
export function Err<E>(e: string): Err<E>;
export function Err<T, E>(e: any): any {
  return (
    e.err ?? {
      err: e,
      map<U>(this: Result<T, E>, _fn: (t: unknown) => Result<U>): Result<U, E> {
        return this as Result<U, E>;
      },
    }
  );
}

export function unwrap<T, E>(result: Result<T, E>): T | never;
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

export function unwrapOr<T, E>(result: Result<T, E>, def: T): T;
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

export function unwrapOrElse<T, E>(result: Result<T, Error>, def: () => T): T;
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
