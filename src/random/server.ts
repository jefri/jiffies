import {randomBytes} from 'crypto';

export function getUint8Array(size: number): Uint8Array {
  return new Uint8Array(randomBytes(size | 0));
};
