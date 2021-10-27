import { assert } from "../../../../jiffies/assert.js";
import { op } from "../../util/asm.js";
import { int10, int16, int2 } from "../../util/twos.js";

export const FORMATS = ["bin", "dec", "hex", "asm"];
/** @typedef {FORMATS[number]} Format */

export const SCREEN = 0x4000;
export const SCREEN_ROWS = 512;
export const SCREEN_COLS = 256;

export class Memory {
  /** @type Int16Array */
  #memory;

  /** @returns {number} */
  get size() {
    return this.#memory.length;
  }

  constructor(/** @type {ArrayBuffer|number} */ memory) {
    if (typeof memory === "number") {
      this.#memory = new Int16Array(memory);
    } else {
      this.#memory = new Int16Array(memory);
    }
  }

  /**
   * @param {number} index
   * @returns  {number}
   */
  get(index) {
    if (index < 0 || index >= this.size) return 0xffff;
    return this.#memory[index] ?? 0;
  }

  /**
   * @param {number} index
   * @param  {number} value
   */
  set(index, value) {
    if (index < 0 || index >= this.size) return 0xffff;
    this.#memory[index] = value & 0xffff;
  }

  /**
   * @param {number} cell
   * @param {string} value
   * @param {Format} format
   */
  update(cell, value, format) {
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
      this.set(cell, current);
    }
  }

  /**
   * @template T
   * @param {(index: number, value: number) => T} fn
   * @param {number=} start
   * @param {number=} end
   * @returns {Iterable<T>}
   */
  *map(fn, start = 0, end = this.size) {
    assert(start < end);
    for (let i = start; i < end; i++) {
      yield fn(i, this.get(i));
    }
  }
}
