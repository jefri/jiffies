import { alu, Flags } from "./alu.js";
import { Memory } from "./memory.js";

export class CPU {
	/** @readonly @type {Memory} */
	RAM;
	/** @readonly @type {Memory} */
	ROM;

	#pc = 0;
	#a = 0;
	#d = 0;

	get PC() {
		return this.#pc;
	}

	get A() {
		return this.#a;
	}

	get D() {
		return this.#d;
	}

	/**
   * @param {{RAM?: Memory, ROM: Memory}} param0
   */
	constructor({ RAM = new Memory(0x7fff), ROM }) {
		this.RAM = RAM;
		this.ROM = ROM;
	}

	reset() {
		this.#pc = 0;
		this.#a = 0;
		this.#d = 0;
	}

	tick() {
		let instruction = this.ROM.get(this.#pc);
		let pc = this.#pc + 1;
		if (instruction & 0x8000) {
			// Calculate ALU result
			const mode = (instruction & 0x1000) > 0;
			const op = (instruction & 0x0fc0) >> 6;
			const a = mode ? this.RAM.get(this.#a) : this.#a;
			const [d, flag] = alu(op, this.#d, a);

			// Store M uses old A, this must come first
			if ((instruction & 0x0008) > 0) {
				this.RAM.set(this.#a, d);
			}
			if ((instruction & 0x0020) > 0) {
				this.#a = d;
			}
			if ((instruction & 0x0010) > 0) {
				this.#d = d;
			}

			// Check jump
			const jn = (instruction & 0x0004) > 0 && flag === Flags.Negative;
			const je = (instruction & 0x0002) > 0 && flag === Flags.Zero;
			const jg = (instruction & 0x0001) > 0 && flag === Flags.Positive;
			if (jn || je || jg) {
				pc = this.#a;
			}
		} else {
			this.#a = instruction;
		}
		if (pc < 0 || pc >= this.ROM.size) {
			throw new Error(
				`HALT: Jump to ${this.#a} out of bounds [0, ${this.ROM.size})`,
			);
		}
		this.#pc = pc;
	}
}
