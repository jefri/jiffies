import { lock } from "./lock";

describe("Lock", function () {
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
    expect(count).to.equal(1);
  });
});
