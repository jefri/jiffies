import { randomBytes } from "crypto";

/**
 * @param {number} size
 * @returns Uint8Array
 */
export function getUint8Array(size) {
  return new Uint8Array(randomBytes(size | 0));
}
