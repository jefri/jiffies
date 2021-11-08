import { FC } from "../../../jiffies/dom/fc.js";
import { article, canvas, figure, header } from "../../../jiffies/dom/html.js";
import { Memory, SCREEN } from "../simulator/chips/memory.js";

const WHITE = "white";
const BLACK = "black";

/** @returns WHITE|BLACK */
function get(
  /** @type Memory */ mem,
  /** @type number */ x,
  /** @type number */ y
) {
  const byte = mem.get(SCREEN + 32 * y + ((x / 16) | 0));
  const bit = byte & (1 << x % 16);
  return bit === 0 ? WHITE : BLACK;
}

function set(
  /** @type Uint8ClampedArray */ data,
  /** @type number */ x,
  /** @type number */ y,
  /** @type WHITE|BLACK */ value
) {
  const pixel = (y * 512 + x) * 4;
  const color = value === WHITE ? 255 : 0;
  data[pixel] = color;
  data[pixel + 1] = color;
  data[pixel + 2] = color;
  data[pixel + 3] = 255;
}

export const Screen = FC(
  "hack-screen",
  /**
   * @param {HTMLElement&{screen?:HTMLCanvasElement, ctx?: CanvasRenderingContext2D}} el
   * @param {{memory: Memory}} param1
   */
  (el, { memory }) => {
    const screen = (el.screen ??= canvas({ width: 512, height: 256 }));
    el.ctx ??= screen.getContext("2d") ?? undefined;
    el.style.width = "calc(512px + 2 * var(--block-spacing-horizontal))";

    if (el.ctx) {
      const image = el.ctx.getImageData(0, 0, 512, 256);
      for (let col = 0; col < 512; col++) {
        for (let row = 0; row < 256; row++) {
          const color = get(memory, col, row);
          set(image.data, col, row, color);
        }
      }
      el.ctx.putImageData(image, 0, 0);
    }

    return article(
      header("Display"),
      figure(
        {
          style: {
            borderTop: "2px solid gray",
            borderLeft: "2px solid gray",
            borderBottom: "2px solid lightgray",
            borderRight: "2px solid lightgray",
          },
        },
        screen
      )
    );
  }
);
