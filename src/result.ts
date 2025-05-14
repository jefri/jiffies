export const isNone = <T>(s: Option<T>): s is None => s === null;
export const isSome = <T>(s: Option<T>): s is Some<T> => s != null;

export function None<T = unknown>(_?: T): Option<T> {
  return null;
}

export function Some<T>(t: Option<T>): Option<T>;
export function Some<T>(t: T): Option<T>;
export function Some<T>(t: Option<T> | T): Option<T> {
  return t;
}

export const isOk = <T, E>(t: Result<T, E>): t is Ok<T> =>
  Object.hasOwn(t, "ok");
export const isErr = <T, E>(e: Result<T, E>): e is Err<E> =>
  Object.hasOwn(e, "err");
export const isResult = <T, E>(t: Result<T, E>): t is Result<T, E> =>
  isOk(t) || isErr(t);

// Beware: Order matters for correct inference.
export function Ok<T, E>(ok: Ok<T>): T;
export function Ok<T, E>(t?: T): Ok<T>;
export function Ok<T, E>(t: T | Ok<T>): T | Ok<T> {
  return isOk(t as Ok<T>)
    ? (t as Ok<T>).ok
    : ({
        ok: t,
        map<U>(fn: (_: typeof t) => Result<U, E>): Result<U, E> {
          return fn(Ok(this));
        },
      } as Ok<T>);
}

// Beware: Order matters for correct inference.
export function Err<T, E>(e: Err<E>): E;
export function Err<T, E>(e: E): Err<E>;
export function Err<T, E>(e: string): Err<E>;
export function Err<T, E>(e: E | string | Err<E>): E | Err<E> {
  return (
    ((e as Err<E>).err as E) ??
    ({
      err: e,
      map<U>(this: Result<T, E>, _fn: (t: unknown) => Result<U>): Result<U, E> {
        return this as Result<U, E>;
      },
    } as Err<E>)
  );
}

export function unwrap<T, E>(result: Result<T, E>): T | never;
export function unwrap<O>(some: Option<O>): O | never;
export function unwrap<T, E>(t: Result<T, E> | Option<T>): T | never {
  if (isNone(t as Option<T>)) {
    throw new Error("Attempted to unwrap None");
  }
  if (isErr(t as Result<T, E>)) {
    throw Err(t);
  }
  if (isOk(t as Result<T, E>)) {
    return Ok(t as Ok<T>);
  }
  throw Err(t);
}

export function unwrapOr<T, E>(result: Result<T, E>, def: T): T;
export function unwrapOr<T>(some: Some<T>, def: T): T;
export function unwrapOr<T, E>(t: Some<T> | Result<T, E>, def: T): T {
  if (isNone(t as Some<T>)) {
    return def;
  }
  if (isErr(t as Result<T, E>)) {
    return def;
  }
  if (isOk(t as Result<T, E>)) {
    return Ok(t as Ok<T>);
  }
  return t as T;
}

export function unwrapOrElse<T, E>(result: Result<T, E>, def: () => T): T;
export function unwrapOrElse<T, E>(some: Some<T>, def: () => T): T;
export function unwrapOrElse<T, E>(t: Result<T, E> | Some<T>, def: () => T): T {
  if (isNone(t as Some<T>)) {
    return def();
  }
  if (isErr(t as Err<T>)) {
    return def();
  }
  if (isOk(t as Ok<T>)) {
    return Ok(t as Ok<T>);
  }
  return t as T;
}

export type None = null;
// biome-ignore lint/suspicious/noRedeclare: This file does trickery with const and type.
export type Some<T> = T;
export type Option<T> = Some<T> | None;
// biome-ignore lint/suspicious/noRedeclare: This file does trickery with const and type.
export type Err<E = Error> = {
  err: E;
  map: <U>(fn: (t: unknown) => Result<U>) => Result<U>;
};
// biome-ignore lint/suspicious/noRedeclare: This file does trickery with const and type.
export type Ok<T> = { ok: T; map: <U>(fn: (t: T) => Result<U>) => Result<U> };
export type Result<T, E = Error> = Ok<T> | Err<E>;
