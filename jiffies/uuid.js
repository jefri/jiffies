import { randomByte } from "./random/index.js";

export const UUID = {
  rvalid:
    /^\{?[0-9a-f]{8}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{12}\}?$/i,
  /** @returns {string} */
  v4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) & 0xf;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  },
};
