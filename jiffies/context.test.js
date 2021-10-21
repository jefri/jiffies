import { Enter, Exit, using } from "./context.js";
import { Err, isErr, isOk, Ok } from "./result.js";
import { describe, it } from "./scope/describe.js";
import { expect } from "./scope/expect.js";

describe("Context", () => {
  it("performs an operation using a context", () => {
    const context = TestContext();
    const result = using(context, () => Ok(5));
    expect(Ok(result)).toBe(5);
    expect(context.initialized).toBe(true);
    expect(context.completed).toBe(true);
  });

  it("reports the result of a thrown error", () => {
    const context = TestContext();

    const result = using(context, () => {
      throw new Error("Failed");
    });

    expect(isErr(result)).toBe(true);
    expect(Err(/** @type Err<Error> */ result)).toMatchObject({
      message: "Failed",
    });
  });

  it("passes the context to the operation", () => {
    const op = using(TestContext, ({ initialized, completed }) => ({
      initialized,
      completed,
    }));

    expect(isOk(op)).toBe(true);
    const { completed, initialized } = Ok(/** @type OK<TestContext> */ op);
    expect(initialized).toBe(true);
    expect(completed).toBe(false);
  });
});

/**
 * @typedef TextContext
 * @property {boolean} initialized
 * @property {boolean} completed}
 */

/** @returns {import("./context.js").Context | TestContext} */
function TestContext() {
  const /** @type import("./context.js").Context | TestContext */ context = {
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
