/**
 * @param {number} size
 * @returns Uint8Array
 */
export function getUint8Array(size) {
  const array = new Uint8Array(size);
  window.crypto.getRandomValues(array);
  return array;
}
