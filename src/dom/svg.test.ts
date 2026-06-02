import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SVG_NAMESPACE_URI, up } from "./dom.ts";

describe("svg", () => {
  it("sets SVG attributes via setAttribute, not setAttributeNS", () => {
    const circle = up<SVGCircleElement>(
      window.document.createElementNS(
        SVG_NAMESPACE_URI,
        "circle",
      ) as SVGCircleElement,
      { cx: 10, cy: 20, r: 5 },
    );

    assert.strictEqual(circle.getAttribute("cx"), "10");
    assert.strictEqual(circle.getAttribute("cy"), "20");
    assert.strictEqual(circle.getAttribute("r"), "5");
    assert.strictEqual(circle.getAttributeNS(SVG_NAMESPACE_URI, "cx"), null);
  });
});
