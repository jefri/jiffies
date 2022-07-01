import { describe, it, expect } from "./scope/index"
import { lock } from "./lock"

describe("Lock", () => {
  it("prevents reentry", function () {
    let count = 0;
    const inc = lock(function () {
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
