import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SVG_NAMESPACE_URI } from "./dom.ts";
import { circle } from "./svg.ts";

describe("svg", () => {
  it("sets SVG attributes via setAttribute, not setAttributeNS", () => {
    const c = circle({ cx: 10, cy: 20, r: 5 });

    assert.strictEqual(c.getAttribute("cx"), "10");
    assert.strictEqual(c.getAttribute("cy"), "20");
    assert.strictEqual(c.getAttribute("r"), "5");
    assert.strictEqual(c.getAttributeNS(SVG_NAMESPACE_URI, "cx"), null);
  });
});
