export type None = null;
export type Some<T> = T;
export type Option<T> = Some<T> | None;
export type Err<E extends Error> = { err: E };
export type Ok<T> = { ok: T };
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

export type isNone = <T>(s: Option<T>) => s is None;
export type isSome = <T>(s: Option<T>) => s is Some<T>;

export function None<T = unknown>(): None;
export function None<T = unknown>(s: Option<T>): None;

export function Some<T>(s: Option<T>): T;
export function Some<T>(t: T): Option<T>;

export type isOk = <T, E extends Error = Error>(t: Result<T, E>) => t is Ok<T>;
export type isErr = <E extends Error>(e: Result<unknown, E>) => e is Err<E>;
export type isResult = <T, E extends Error = Error>(
  t: T | Result<T, E>
) => t is Result<T, E>;

// Beware: Order matters for correct inference.
export function Ok<T>(ok: Ok<T>): T;
export function Ok<T>(t: T): Ok<T>;

// Beware: Order matters for correct inference.
export function Err<E extends Error>(e: Err<E>): E;
export function Err<E extends Error>(e: E): Err<E>;
export function Err<E extends Error>(e: string): Err<E>;

export function unwrap<T>(result: Result<T, Error>): T;
export function unwrap<T>(some: Some<T>): T;

export function unwrapOr<T>(result: Result<T, Error>, def: T): T;
export function unwrapOr<T>(some: Some<T>, def: T): T;

export function unwrapOrElse<T>(result: Result<T, Error>, def: () => T): T;
export function unwrapOrElse<T>(some: Some<T>, def: () => T): T;
