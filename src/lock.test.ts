import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lock } from "./lock.ts";

describe("Lock", () => {
  it("prevents reentry", () => {
    let count = 0;
    const inc = lock(() => {
      if (count > 4) {
        return;
      }
      inc();
      count++;
    });
    inc();
    assert.strictEqual(count, 1);
  });
});
