import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SVG_NAMESPACE_URI } from "./dom.ts";
import { circle, stop } from "./svg.ts";

describe("svg", () => {
  it("sets SVG attributes via setAttribute, not setAttributeNS", () => {
    const c = circle({ cx: 10, cy: 20, r: 5 });

    assert.strictEqual(c.getAttribute("cx"), "10");
    assert.strictEqual(c.getAttribute("cy"), "20");
    assert.strictEqual(c.getAttribute("r"), "5");
    assert.strictEqual(c.getAttributeNS(SVG_NAMESPACE_URI, "cx"), null);
  });

  it("accepts SVG presentation attributes", () => {
    const c = circle({ fill: "blue", stroke: "red", opacity: "0.5" });
    assert.strictEqual(c.getAttribute("fill"), "blue");
    assert.strictEqual(c.getAttribute("stroke"), "red");
    assert.strictEqual(c.getAttribute("opacity"), "0.5");
  });

  it("accepts stop-color on stop element", () => {
    const s = stop({ "stop-color": "#ffffff", "stop-opacity": "0.8" });
    assert.strictEqual(s.getAttribute("stop-color"), "#ffffff");
    assert.strictEqual(s.getAttribute("stop-opacity"), "0.8");
  });
});
