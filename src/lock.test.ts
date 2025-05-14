import { lock } from "./lock.js";
import { describe, expect, it } from "./scope/index.js";

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
    expect(count).toBe(1);
  });
});
