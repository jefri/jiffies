import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type Context, Enter, Exit, using } from "./context.ts";
import { Err, isErr, isOk, Ok, unwrap } from "./result.ts";

describe("Context", () => {
  it("performs an operation using a context", () => {
    const context = TestContext();
    const result = using(context, () => Ok(5));
    assert.strictEqual(unwrap(result), 5);
    assert.strictEqual(context.initialized, true);
    assert.strictEqual(context.completed, true);
  });

  it("reports the result of a thrown error", () => {
    const context = TestContext();

    const result = using(context, () => {
      throw new Error("Failed");
    });

    assert.strictEqual(isErr(result), true);
    // Error.message is non-enumerable, so a partial structural compare does not
    // see it; assert the property directly.
    assert.strictEqual(Err(result as Err<Error>).message, "Failed");
  });

  it("passes the context to the operation", () => {
    const op = using(TestContext, ({ initialized, completed }) => ({
      initialized,
      completed,
    }));

    assert.strictEqual(isOk(op), true);
    const { completed, initialized } = unwrap(op);
    assert.strictEqual(initialized, true);
    assert.strictEqual(completed, false);
  });
});

interface TestContext {
  initialized: boolean;
  completed: boolean;
}

function TestContext(): Context & TestContext {
  const context = {
    [Enter]: () => {
      context.initialized = true;
    },
    [Exit]: () => {
      context.completed = true;
    },
    initialized: false,
    completed: false,
  };
  return context;
}
