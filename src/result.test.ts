import {
  Err,
  None,
  Ok,
  Option,
  Result,
  Some,
  unwrap,
  unwrapOr,
  unwrapOrElse,
} from "./result.js";
import { describe, it } from "./scope/describe.js";
import { expect } from "./scope/expect.js";

describe("Result", () => {
  it("converts Nones", () => {
    const a: Option<string> = None();
    expect(a).toBeNull();

    const b: Option<string> = None("b");
    expect(b).toBeNull();

    const c: Option<string> = Some(a);
    expect(c).toBeNull();

    const d: Option<string> = Some(b);
    expect(c).toBeNull();
  });

  it("converts Somes", () => {
    const a: Option<string> = Some("a");
    expect(a).toBe("a");

    const b: Option<string> = Some(a);
    expect(b).toBe("a");
  });

  it("converts Errs", () => {
    const a: Result<string> = Err(new Error("a error"));

    const b: Error = Err(a);
    expect(b).toMatchObject({ message: "a error" });
  });

  it("converts Oks", () => {
    const a: Result<string> = Ok("a ok");
    const b: string = Ok(a);

    expect(b).toBe("a ok");
  });

  it("unwraps", () => {
    const a: Option<string> = Some("some");
    const b: Option<string> = None();
    const c: Result<string, Error> = Ok("ok");
    const d: Result<string, Error> = Err(new Error("err"));
    const e: Option<string> = "else";

    expect(unwrap(a)).toBe("some");
    expect(unwrap(c)).toBe("ok");
    expect(() => unwrap(b)).toThrow("Attempted to unwrap None");
    expect(() => unwrap(d)).toThrow("err");
    expect(unwrap(e)).toBe("else");
  });

  it("unwrapsOrs", () => {
    const a: Option<string> = Some("some");
    const b: Option<string> = None();
    const c: Result<string, Error> = Ok("ok");
    const d: Result<string, Error> = Err(new Error("err"));
    const e: Option<string> = "else";

    expect(unwrapOr(a, "z")).toBe("some");
    expect(unwrapOr(c, "z")).toBe("ok");
    expect(unwrapOr(b, "z")).toBe("z");
    expect(unwrapOr(d, "z")).toBe("z");
    expect(unwrapOr(e, "z")).toBe("else");
  });

  it("unwrapsOrElse", () => {
    const a: Option<string> = Some("some");
    const b: Option<string> = None();
    const c: Result<string, Error> = Ok("ok");
    const d: Result<string, Error> = Err(new Error("err"));
    const e: Option<string> = "else";

    expect(unwrapOrElse(a, () => "z")).toBe("some");
    expect(unwrapOrElse(c, () => "z")).toBe("ok");
    expect(unwrapOrElse(b, () => "z")).toBe("z");
    expect(unwrapOrElse(d, () => "z")).toBe("z");
    expect(unwrapOrElse(e, () => "z")).toBe("else");
  });
});

export {};
