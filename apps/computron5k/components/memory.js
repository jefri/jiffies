import { Memory as MemoryChip } from "../simulator/chips/memory.js";
import { asm, op } from "../util/asm.js";
import { bin, dec, hex, int10, int16, int2 } from "../util/twos.js";

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

const FORMATS = ["bin", "dec", "hex", "asm"];
/** @typedef {FORMATS[number]} Format */

/**
 * @typedef {HTMLElement&{virtualScroll: VirtualScroll<number, MemoryCell>}} MemoryBlock
 */

const MemoryBlock = FC(
  "memory-block",
  /**
   * @param {MemoryBlock} element
   * @param { {
      memory: MemoryChip;
      highlight?: number;
      editable?: boolean;
      format: (v: number) => string;
      update: (i: number, value: string, previous: number) => void;
    } } props
  */
  (element, { memory, highlight = -1, editable = false, format, update }) => {
    element.virtualScroll ??= VirtualScroll({
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
  (el, { index, value, editable = false, onChange = () => {} }) => [
    code(
      {
        style: {
          ...width("1/4"),
          ...rounded("none"),
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
        },
      },
      editable
        ? InlineEdit({ value, events: { change: onChange } })
        : span(value)
    ),
  ]
);

/** 
 * @param {{
    name?: string;
    highlight?: number;
    editable?: boolean;
    memory: MemoryChip;
  }} props
 */
const Memory = ({
  name = "Memory",
  highlight = -1,
  editable = true,
  memory,
}) => {
  let format = "dec";
  const setFormat = (/** @type Format */ f) => {
    format = f;
    buttonBar.update({ value: format });
  };

  /**
   * @param {number} v
   * @returns string
   */
  function doFormat(v) {
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

  /**
   * @param {number} cell
   * @param {string} value
   * @param {number} previous
   */
  function update(cell, value, previous) {
    /** @type number */
    let current;
    switch (format) {
      case "asm":
        current = op(value);
        break;
      case "bin":
        current = int2(value);
        break;
      case "hex":
        current = int16(value);
        break;
      case "dec":
      default:
        current = int10(value);
        break;
    }

    if (isFinite(current) && current <= 0xffff) {
      memory.set(cell, current);
    }
  }

  const buttonBar = ButtonBar({
    value: format,
    values: FORMATS,
    events: { click: setFormat },
  });

  const memoryBlock = MemoryBlock({
    memory,
    highlight,
    editable,
    format: doFormat,
    update,
  });

  return article(header(nav(ul(span(name)), buttonBar)), memoryBlock);
};

export default Memory;
