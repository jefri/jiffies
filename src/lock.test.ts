import { lock } from "./lock.ts";
import { describe, expect, it } from "./scope/index.ts";

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
