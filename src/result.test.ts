import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Err,
  None,
  Ok,
  type Result,
  Some,
  unwrap,
  unwrapOr,
  unwrapOrElse,
} from "./result.ts";

describe("Result", () => {
  it("converts Nones", () => {
    const a = None<string>();
    assert.strictEqual(a, null);

    const b = None<string>();
    assert.strictEqual(b, null);

    const c = Some(a);
    assert.strictEqual(c, null);

    const d = Some(b);
    assert.strictEqual(d, null);
  });

  it("converts Somes", () => {
    const a = Some("a");
    assert.strictEqual(a, "a");

    const b = Some(a);
    assert.strictEqual(b, "a");
  });

  it("converts Errs", () => {
    const a = Err(new Error("a error"));
    const b = Err(a);
    // Error.message is non-enumerable, so assert the property directly rather
    // than via a structural compare.
    assert.strictEqual((b as Error).message, "a error");

    // Assign Err to Result
    const _c: Result<string> = a;
  });

  it("converts Oks", () => {
    const a = Ok("a ok");
    const b = Ok(a);
    assert.strictEqual(b, "a ok");

    // Assign ok to Result
    const _c: Result<string> = a;
  });

  it("unwraps", () => {
    const a = Some("some");
    const b = None<string>();
    const c = Ok("ok");
    const d = Err(new Error("err"));
    const e: string = "else";

    assert.strictEqual(unwrap(a), "some");
    assert.strictEqual(unwrap<string, Error>(c), "ok");
    assert.throws(() => unwrap(b), /Attempted to unwrap None/);
    assert.throws(() => unwrap(d), /err/);
    assert.strictEqual(unwrap(e), "else");
  });

  it("unwrapsOrs", () => {
    const a = Some<string>("some");
    const b = None<string>();
    const c = Ok<string>("ok");
    const d = Err(new Error("err"));
    const e: string = "else";

    assert.strictEqual(unwrapOr(a, "z"), "some");
    assert.strictEqual(unwrapOr(c, "z"), "ok");
    assert.strictEqual(unwrapOr(b, "z"), "z");
    assert.strictEqual(unwrapOr(d, "z"), "z");
    assert.strictEqual(unwrapOr(e, "z"), "else");
  });

  it("unwrapsOrElse", () => {
    const a = Some<string>("some");
    const b = None();
    const c = Ok("ok");
    const d = Err(new Error("err"));
    const e = "else";

    assert.strictEqual(
      unwrapOrElse(a, () => "z"),
      "some",
    );
    assert.strictEqual(
      unwrapOrElse(c, () => "z"),
      "ok",
    );
    assert.strictEqual(
      unwrapOrElse(b, () => "z"),
      "z",
    );
    assert.strictEqual(
      unwrapOrElse(d, () => "z"),
      "z",
    );
    assert.strictEqual(
      unwrapOrElse(e, () => "z"),
      "else",
    );
  });

  it("allows Result<void> with Ok()", () => {
    const a: Result<void> = Ok();
    assert.strictEqual(unwrap(a), undefined);
  });
});
