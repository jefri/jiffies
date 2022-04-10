import { display } from "./display.js";

export type None = null;
export type Some<T> = T;
export type Option<T> = Some<T> | None;
export type Err<E extends Error> = { err: E };
export type Ok<T> = { ok: T };
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

export const isNone = <T>(s: Option<T>): s is None => s == null;
export const isSome = <T>(s: Option<T>): s is Some<T> => s != null;

export function None<T = unknown>(): None;
export function None<T = unknown>(t: Option<T>): None;
export function None<T>(t?: Option<T>): None {
  return null;
}

export function Some<T>(t: Option<T>): Option<T>;
export function Some<T>(t: T): Option<T>;
export function Some<T>(t: T | Option<T>): Option<T> {
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
export function Ok<T>(t: T | Ok<T>): T | Ok<T> {
  return (t as Ok<T>).ok ? (t as Ok<T>).ok : { ok: t as T };
}

// Beware: Order matters for correct inference.
export function Err<E extends Error>(e: Err<E>): E;
export function Err<E extends Error>(e: E): Err<E>;
export function Err<E extends Error>(e: string): Err<E>;
export function Err<E extends Error>(e: E | Err<E> | string): E | Err<E> {
  return (e as Err<E>).err ?? { err: typeof e === "string" ? new Error(e) : e };
}

export function unwrap<T>(some: Option<T>): T | never;
export function unwrap<T, E extends Error>(result: Result<T, E>): T | never;
export function unwrap<T, E extends Error>(
  t: Option<T> | Result<T, E>
): T | never {
  if (isNone(t)) {
    throw new Error(`Attempted to unwrap None`);
  }
  if (isErr(t as Err<E>)) {
    throw Err(t as Err<E>);
  }
  if (isOk(t as Result<T, E>)) {
    return Ok(t as Ok<T>);
  }
  return t as T;
}

export function unwrapOr<T, E extends Error>(result: Result<T, E>, def: T): T;
export function unwrapOr<T>(some: Some<T>, def: T): T;
export function unwrapOr<T, E extends Error>(
  t: Some<T> | Result<T, E>,
  def: T
): T {
  if (isNone(t)) {
    return def;
  }
  if (isErr(t as Err<E>)) {
    return def;
  }
  if (isOk(t as Ok<T>)) {
    return Ok(t as Ok<T>);
  }
  return t as T;
}

export function unwrapOrElse<T, E extends Error>(
  result: Result<T, Error>,
  def: () => T
): T;
export function unwrapOrElse<T>(some: Some<T>, def: () => T): T;
export function unwrapOrElse<T, E extends Error>(
  t: Some<T> | Result<T, Error>,
  def: () => T
): T {
  if (isNone(t)) {
    return def();
  }
  if (isErr(t as Err<E>)) {
    return def();
  }
  if (isOk(t as Ok<T>)) {
    return Ok(t as Ok<T>);
  }
  return t as T;
}
