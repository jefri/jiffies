import { describe, expect, it } from "./scope/index.js";
import { UUID } from "./uuid.js";

describe("UUID", function () {
  it("generates random UUIDs", function () {
    expect(UUID.v4()).toMatch(UUID.rvalid);
  });

  it("is generating UUIDs with random numbers", function () {
    expect(UUID.v4()).not.toEqual("00000000-0000-4000-8000-000000000000");
  });
});
