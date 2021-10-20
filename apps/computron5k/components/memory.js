import { Memory as MemoryChip } from "../simulator/chips/memory.js";
import { asm, op } from "../util/asm.js";
import { bin, dec, hex, int10, int16, int2 } from "../util/twos.js";

import ButtonBar from "../../../src/components/button_bar.js";
import InlineEdit from "../../../src/components/inline_edit.js";
import VirtualScroll from "../../../src/components/virtual_scroll.js";
import { article, code, header, nav, span, ul } from "../../../src/dom/html.js";
import { rounded, text, width } from "../../../src/dom/css.js";
import { FC } from "../../../src/dom/fc.js";

const FORMATS = ["bin", "dec", "hex", "asm"];
/** @typedef {FORMATS[number]} Formats */

/**
 * @param { {
    memory: MemoryChip;
    highlight?: number;
    editable?: boolean;
    format: (v: number) => string;
    update: (i: number, value: string, previous: number) => void;
  } } props
 */
const MemoryBlock = ({
  memory,
  highlight = -1,
  editable = false,
  format,
  update,
}) =>
  VirtualScroll({
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

/**
 * @param {{
    index: number;
    value: string;
    highlight: boolean;
    editable?: boolean;
    onChange?: (v: string) => void;
  }} props
 */
const MemoryCell = FC(
  "memory-cell",
  ({ index, value, editable = false, onChange = () => {} }) => [
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
  const setFormat = (f) => {
    format = f;
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

  return article(
    header(
      nav(
        ul(span(name)),
        ButtonBar({
          value: format,
          values: FORMATS,
          events: { click: setFormat },
        })
      )
    ),
    MemoryBlock({ memory, highlight, editable, format: doFormat, update })
  );
};

export default Memory;
