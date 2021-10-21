import { assert } from "../../../../jiffies/assert.js";

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
