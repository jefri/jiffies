import { div } from "../dom/html.js";
import { describe, it, expect } from "../scope/index.js";
import VirtualScroll, { arrayAdapter } from "./virtual_scroll.js";

describe("VirtualScroll", () => {
  it("tracks scroll position", () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    /** @type {import("./virtual_scroll.js").VirtualScrollProps<number>} */
    const props = {
      settings: { count: 3, startIndex: 2 },
      get: arrayAdapter(data),
      row: (i) => div(`${i}`),
    };
    const scroll = VirtualScroll(props);

    expect(scroll.state.bufferedItems).toBe(9);
    //expect(scroll.state.topPaddingHeight).toBe(0);
    expect(scroll.state.viewportHeight).toBe(60);
    //expect(scroll.state.totalHeight).toBe(200);
    expect(scroll.state.data).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
