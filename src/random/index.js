import { getUint8Array } from "./server";

export function randomByte() {
  const array = getUint8Array(1);
  return [].slice.call(array)[0];
}
