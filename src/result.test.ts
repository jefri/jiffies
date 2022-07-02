import {
  Err,
  None,
  Ok,
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
    const a = None<string>();
    expect(a).toBeNull();

    const b = None<string>();
    expect(b).toBeNull();

    const c = Some(a);
    expect(c).toBeNull();

    const d = Some(b);
    expect(d).toBeNull();
  });

  it("converts Somes", () => {
    const a = Some("a");
    expect(a).toBe("a");

    const b = Some(a);
    expect(b).toBe("a");
  });

  it("converts Errs", () => {
    const a = Err(new Error("a error"));
    const b = Err(a);
    expect(b).toMatchObject({ message: "a error" });

    // Assign Err to Result
    const c: Result<string> = a;
  });

  it("converts Oks", () => {
    const a = Ok("a ok");
    const b = Ok(a);
    expect(b).toBe("a ok");

    // Assign ok to Result
    const c: Result<string> = a;
  });

  it("unwraps", () => {
    const a = Some("some");
    const b = None<string>();
    const c = Ok("ok");
    const d = Err(new Error("err"));
    const e: string = "else";

    expect(unwrap(a)).toBe("some");
    expect(unwrap<string, Error>(c)).toBe("ok");
    expect(() => unwrap(b)).toThrow("Attempted to unwrap None");
    expect(() => unwrap(d)).toThrow("err");
    expect(unwrap(e)).toBe("else");
  });

  it("unwrapsOrs", () => {
    const a = Some<string>("some");
    const b = None<string>();
    const c = Ok<string>("ok");
    const d = Err(new Error("err"));
    const e: string = "else";

    expect(unwrapOr(a, "z")).toBe("some");
    expect(unwrapOr(c, "z")).toBe("ok");
    expect(unwrapOr(b, "z")).toBe("z");
    expect(unwrapOr(d, "z")).toBe("z");
    expect(unwrapOr(e, "z")).toBe("else");
  });

  it("unwrapsOrElse", () => {
    const a = Some<string>("some");
    const b = None();
    const c = Ok("ok");
    const d = Err(new Error("err"));
    const e = "else";

    expect(unwrapOrElse(a, () => "z")).toBe("some");
    expect(unwrapOrElse(c, () => "z")).toBe("ok");
    expect(unwrapOrElse(b, () => "z")).toBe("z");
    expect(unwrapOrElse(d, () => "z")).toBe("z");
    expect(unwrapOrElse(e, () => "z")).toBe("else");
  });
});

export {};
