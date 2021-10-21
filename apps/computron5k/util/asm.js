import { describe, it, expect } from "../../../jiffies/scope/index.js";
import { ASSIGN, COMMANDS, JUMP } from "../simulator/chips/alu.js";

/** @typedef {keyof typeof COMMANDS.op} CommandOps */
/** @typedef {keyof typeof JUMP.op} JumpOps */
/** @typedef {keyof typeof ASSIGN.op} StoreOps */

/**
 * @param {number} op
 * @returns string
 */
export function asm(op) {
  if (op & 0x8000) return cInstruction(op);
  return aInstruction(op);
}

/**
 * @param {number} op
 * @returns string
 */
function cInstruction(op) {
  op = op & 0xffff; // Clear high order bits
  const mop = (op & 0x1000) >> 12;
  let cop = /** @type CommandOps */ ((op & 0b0000111111000000) >> 6);
  let sop = /** @type StoreOps */ ((op & 0b0000000000111000) >> 3);
  let jop = /** @type JumpOps */ (op & 0b0000000000000111);

  if (COMMANDS.op[cop] === undefined) {
    // Invalid commend
    return "#ERR";
  }

  let command = COMMANDS.op[cop];
  if (mop) command = command.replace(/A/g, "M");

  const store = ASSIGN.op[sop];
  const jump = JUMP.op[jop];

  let instruction = command;
  if (store) instruction = `${store}=${instruction}`;
  if (jump) instruction = `${instruction};${jump}`;

  return instruction;
}

/**
 * @param {number} op
 * @returns string
 */
function aInstruction(op) {
  return "@" + (op & 0x7fff).toString(10);
}

/**
 * @param {string} asm
 * @returns number
 */
export function op(asm) {
  if (asm[0] === "@") {
    return aop(asm);
  } else {
    return cop(asm);
  }
}

/**
 * @param {string} asm
 * @returns number
 */
function aop(asm) {
  return parseInt(asm.substring(1), 10);
}

/**
 * @param {string} asm
 * @returns number
 */
function cop(asm) {
  let parts = asm.match(
    /(?:([AMD]{1,3})=)?([-!01ADM&|]{1,3})(?:;(JGT|JLT|JGE|JLE|JEQ|JMP))?/
  );
  if (!parts) {
    parts = ["", "", ""];
  } else if (parts.length === 2) {
    parts = ["", parts[1], ""];
  } else if (parts.length === 3) {
    if (parts[2][0] === ";") {
      parts = ["", parts[1], parts[2]];
    } else {
      parts = [parts[1], parts[2], ""];
    }
  }
  const [_, assign, operation, jump] = parts;
  const mode = operation.indexOf("M") > 0 ? 1 : 0;
  const aop = ASSIGN.asm[assign] ?? 0;
  const jop = JUMP.asm[jump] ?? 0;
  const cop = COMMANDS.asm[operation] ?? 0;

  return 0xd000 | (mode << 12) | (cop << 6) | (aop << 3) | jop;
}
