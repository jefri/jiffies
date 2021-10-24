import { FORMATS, Memory as MemoryChip } from "../simulator/chips/memory.js";
import { asm } from "../util/asm.js";
import { bin, dec, hex } from "../util/twos.js";
/** @typedef {import("../simulator/chips/memory.js").Format} Format */

import ButtonBar from "../../../jiffies/components/button_bar.js";
import InlineEdit from "../../../jiffies/components/inline_edit.js";
import VirtualScroll from "../../../jiffies/components/virtual_scroll.js";
import {
  article,
  code,
  header,
  nav,
  span,
  ul,
} from "../../../jiffies/dom/html.js";
import { rounded, text, width } from "../../../jiffies/dom/css.js";
import { FC } from "../../../jiffies/dom/fc.js";

const MemoryBlock = FC(
  "memory-block",
  /**
   * @param {HTMLElement & {virtualScroll: VirtualScroll<number, MemoryCell>}} element
   * @param { {
      memory: MemoryChip;
      highlight?: number;
      editable?: boolean;
      format: (v: number) => string;
      update: (i: number, value: string, previous: number) => void;
    } } props
  */
  (element, { memory, highlight = -1, editable = false, format, update }) => {
    if (element.virtualScroll) {
      element.virtualScroll.update();
    } else {
      element.virtualScroll = VirtualScroll({
        settings: { count: 20, maxIndex: memory.size, itemHeight: 35 },
        get: (o, l) => memory.map((i, v) => [i, v], o, o + l),
        row: ([i, v]) =>
          MemoryCell({
            index: i,
            value: format(v),
            editable: editable,
            highlight: i === highlight,
            onChange: (value) => update(i, value, v),
          }),
      });
    }
    return element.virtualScroll;
  }
);

const MemoryCell = FC(
  "memory-cell",
  /**
   * @param {HTMLElement} el
   * @param {{
      index: number;
      value: string;
      highlight: boolean;
      editable?: boolean;
      onChange?: (v: string) => void;
    }} props
  */
  (
    el,
    { index, value, highlight = false, editable = false, onChange = () => {} }
  ) => [
    code(
      {
        style: {
          ...width("1/4"),
          ...rounded("none"),
          ...(highlight
            ? { background: "var(--code-kbd-background-color)" }
            : {}),
        },
      },
      hex(index)
    ),
    code(
      {
        style: {
          ...width("3/4"),
          ...rounded("none"),
          ...text("right"),
          ...(highlight
            ? { background: "var(--code-kbd-background-color)" }
            : {}),
        },
      },
      editable
        ? InlineEdit({ value, events: { change: onChange } })
        : span(value)
    ),
  ]
);

const Memory = FC(
  "memory-gui",
  /** 
   * @param {import("../../../jiffies/dom/dom.js").Updateable<HTMLElement>} el
   * @param {{
       name?: string;
        highlight?: number;
        editable?: boolean;
        memory: MemoryChip;
        format: Format;
      }} props
   */
  (
    el,
    { name = "Memory", highlight = -1, editable = true, memory, format = "dec" }
  ) => {
    const setFormat = (/** @type Format */ f) => {
      format = f;
      buttonBar.update({ value: format });
      memoryBlock.update();
    };

    const buttonBar = ButtonBar({
      value: format,
      values: FORMATS,
      events: { click: setFormat },
    });

    const memoryBlock = MemoryBlock({
      memory,
      highlight,
      editable,
      format: (v) => doFormat(format, v),
      update: (i, v) => memory.update(i, v, format),
    });

    return article(header(nav(ul(span(name)), buttonBar)), memoryBlock);
  }
);

export default Memory;

/**
 * @param {Format} format
 * @param {number} v
 * @returns string
 */
function doFormat(format, v) {
  switch (format) {
    case "bin":
      return bin(v);
    case "hex":
      return hex(v);
    case "asm":
      return asm(v);
    case "dec":
    default:
      return dec(v);
  }
}
