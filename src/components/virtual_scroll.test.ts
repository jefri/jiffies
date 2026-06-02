import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { State } from "../dom/fc.ts";
import { div } from "../dom/html.ts";
import VirtualScroll, {
  arrayAdapter,
  type VirtualScrollProps,
} from "./virtual_scroll.ts";

describe("VirtualScroll", () => {
  it("tracks scroll position", () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    const props: VirtualScrollProps<number, HTMLDivElement> = {
      settings: { count: 3, startIndex: 2 },
      get: arrayAdapter(data),
      row: (i) => div(`${i}`),
    };

    const scroll = VirtualScroll(
      // @ts-expect-error
      props,
    );

    assert.strictEqual(scroll[State]?.bufferedItems, 9);
    assert.deepStrictEqual(scroll[State]?.data, [0, 1, 2, 3, 4]);
    assert.strictEqual(scroll[State]?.viewportHeight, 60);
  });
});
