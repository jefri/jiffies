/** @template T @typedef {import ("./result").Option<T>} Option */
/**
 * @template T
 * @template {Error} E
 * @typedef {import ("./result").Result<T, E>} Result
 */

import {
  Err,
  None,
  Ok,
  Some,
  unwrap,
  unwrapOr,
  unwrapOrElse,
} from "./result.js";
import { describe, it } from "./scope/describe.js";
import { expect } from "./scope/expect.js";

describe("Result", () => {
  it("converts Nones", () => {
    /** @type {Option<string>} */ const a = None();
    expect(a).toBeNull();

    /** @type {Option<string>} */ const b = None("b");
    expect(b).toBeNull();

    /** @type {Option<string>} */ const c = Some(a);
    expect(c).toBeNull();

    /** @type {Option<string>} */ const d = Some(b);
    expect(c).toBeNull();
  });

  it("converts Somes", () => {
    /** @type {Option<string>} */ const a = Some("a");
    expect(a).toBe("a");

    /** @type {Option<string>} */ const b = Some(a);
    expect(b).toBe("a");
  });

  it("converts Errs", () => {
    /** @type {Result<string, Error>} */ const a = Err(new Error("a error"));

    /** @type {Error } */ const b = Err(a);
    expect(b).toMatchObject({ message: "a error" });
  });

  it("converts Oks", () => {
    /** @type {Result<string, Error>} */ const a = Ok("a ok");
    /** @type {string } */ const b = Ok(a);

    expect(b).toBe("a ok");
  });

  it("unwraps", () => {
    /** @type {Option<string>} */ const a = Some("some");
    /** @type {Option<string>} */ const b = None();
    /** @type {Result<string, Error>} */ const c = Ok("ok");
    /** @type {Result<string, Error>} */ const d = Err(new Error("err"));
    /** @type {Option<string>} */ const e = "else";

    expect(unwrap(a)).toBe("some");
    expect(unwrap(c)).toBe("ok");
    expect(() => unwrap(b)).toThrow("Attempted to unwrap None");
    expect(() => unwrap(d)).toThrow("err");
    expect(unwrap(e)).toBe("else");
  });

  it("unwrapsOrs", () => {
    /** @type {Option<string>} */ const a = Some("some");
    /** @type {Option<string>} */ const b = None();
    /** @type {Result<string, Error>} */ const c = Ok("ok");
    /** @type {Result<string, Error>} */ const d = Err(new Error("err"));
    /** @type {Option<string>} */ const e = "else";

    expect(unwrapOr(a, "z")).toBe("some");
    expect(unwrapOr(c, "z")).toBe("ok");
    expect(unwrapOr(b, "z")).toBe("z");
    expect(unwrapOr(d, "z")).toBe("z");
    expect(unwrapOr(e, "z")).toBe("else");
  });

  it("unwrapsOrElse", () => {
    /** @type {Option<string>} */ const a = Some("some");
    /** @type {Option<string>} */ const b = None();
    /** @type {Result<string, Error>} */ const c = Ok("ok");
    /** @type {Result<string, Error>} */ const d = Err(new Error("err"));
    /** @type {Option<string>} */ const e = "else";

    expect(unwrapOrElse(a, () => "z")).toBe("some");
    expect(unwrapOrElse(c, () => "z")).toBe("ok");
    expect(unwrapOrElse(b, () => "z")).toBe("z");
    expect(unwrapOrElse(d, () => "z")).toBe("z");
    expect(unwrapOrElse(e, () => "z")).toBe("else");
  });
});

export {};
