export function getUint8Array(size: number): Uint8Array {
  let array = new Uint8Array(size);
  window.crypto.getRandomValues(array);
  return array;
};
