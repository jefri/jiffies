import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REPO, trustArgs, WORKFLOW } from "./npm-trust.ts";

describe("trustArgs", () => {
  it("trusts release.yml of this repo for direct publish", () => {
    const args = trustArgs("@davidsouther/jiffies");
    assert.deepEqual(args.slice(0, 3), [
      "trust",
      "github",
      "@davidsouther/jiffies",
    ]);
    assert.equal(args[args.indexOf("--file") + 1], WORKFLOW);
    assert.equal(args[args.indexOf("--repo") + 1], REPO);
    assert.ok(args.includes("--allow-publish"));
  });
});
