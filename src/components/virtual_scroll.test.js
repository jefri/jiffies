import { div } from "../dom/html.js";
import { describe, it, expect } from "../scope/index.js";
import VirtualScroll, { arrayAdapter } from "./virtual_scroll.js";

describe("VirtualScroll", () => {
  it("tracks scroll position", () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    const scroll = new VirtualScroll({
      settings: { count: 3, startIndex: 2 },
      get: arrayAdapter(data),
      row: (/* @type {number} */ i) => div(i),
    });
    scroll.componentDidMount();

    expect(scroll.state.bufferedItems).toBe(9);
    expect(scroll.state.topPaddingHeight).toBe(0);
    expect(scroll.state.viewportHeight).toBe(60);
    expect(scroll.state.totalHeight).toBe(200);
  });
});
