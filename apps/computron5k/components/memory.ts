import {
  Format,
  FORMATS,
  Memory as MemoryChip,
} from "../simulator/cpu/memory.js";
import { asm } from "../util/asm.js";
import { bin, dec, hex } from "../util/twos.js";
/** @typedef {import("../simulator/cpu/memory.js").Format} Format */

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
import { rounded } from "../../../jiffies/dom/css/border.js";
import { width } from "../../../jiffies/dom/css/sizing.js";
import { text } from "../../../jiffies/dom/css/typography.js";
import { FC } from "../../../jiffies/dom/fc.js";
import { li } from "../../../jiffies/dom/html.js";
import { Updatable } from "../../../jiffies/dom/dom.js";

const MemoryBlock = FC(
  "memory-block",
  (
    element: Updatable<HTMLElement> & {
      virtualScroll: VirtualScroll<number, typeof MemoryCell>;
    },
    {
      memory,
      highlight = -1,
      editable = false,
      format,
      onChange,
    }: {
      memory: MemoryChip;
      highlight?: number;
      editable?: boolean;
      format: (v: number) => string;
      onChange: (i: number, value: string, previous: number) => void;
    }
  ) => {
    if (element.virtualScroll) {
      element.virtualScroll.update();
    } else {
      element.virtualScroll = VirtualScroll({
        settings: { count: 20, maxIndex: memory.size, itemHeight: 28 },
        get: (o, l) => memory.map((i, v) => [i, v], o, o + l),
        row: ([i, v]) =>
          MemoryCell({
            index: i,
            value: format(v),
            editable: editable,
            highlight: i === highlight,
            onChange: (value) => onChange(i, value, v),
          }),
      });
    }
    return element.virtualScroll;
  }
);

const MemoryCell = FC(
  "memory-cell",
  (
    el: Updatable<HTMLElement>,
    {
      index,
      value,
      highlight = false,
      editable = false,
      onChange = () => {},
    }: {
      index: number;
      value: number;
      highlight?: boolean;
      editable?: boolean;
      onChange: (i: number, value: string, previous: number) => void;
    }
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
        ? InlineEdit({ value: `${value}`, events: { change: onChange } })
        : span(value)
    ),
  ]
);

const Memory = FC(
  "memory-gui",
  (
    el: Updatable<HTMLElement> & { state?: { format: Format } },
    {
      name = "Memory",
      highlight = -1,
      editable = true,
      memory,
      format = "dec",
    }: {
      name?: string;
      editable?: boolean;
      highlight?: number;
      memory: MemoryChip;
      format: Format;
    }
  ) => {
    el.style.width = "256px";
    const state = (el.state ??= { format });
    const setFormat = (f: Format) => {
      state.format = f;
      buttonBar.update({ value: state.format });
      memoryBlock.update();
    };

    const buttonBar = ButtonBar({
      value: state.format,
      values: FORMATS,
      events: { onSelect: setFormat },
    });

    const memoryBlock = MemoryBlock({
      memory,
      highlight,
      editable,
      format: (v) => doFormat(state.format, v),
      onChange: (i, v) => {
        memory.update(i, v, state.format);
        memoryBlock.update();
      },
    });

    return article(header(nav(ul(li(name)), buttonBar)), memoryBlock);
  }
);

export default Memory;

function doFormat(format: Format, v: number): string {
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
