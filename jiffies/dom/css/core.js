import { Sides, Sizes } from "./constants.js";

/** @returns {v is Side} */
export function isSide(/** @type {string} */ v) {
  return Sides[v] !== undefined;
}

/** @returns {v is Size} */
export function isSize(/** @type {string} */ v) {
  return Sizes[v] !== undefined;
}

export function getSize(/** @type {import("./constants.js").Size} */ size) {
  return Sizes[size];
}

/** @returns {string[]} */
export function getSide(/** @type {import("./constants.js").Side} */ side) {
  switch (side) {
    case "t":
      return [...getSide("tl"), ...getSide("tr")];
    case "r":
      return [...getSide("tr"), ...getSide("br")];
    case "b":
      return [...getSide("br"), ...getSide("bl")];
    case "l":
      return [...getSide("tl"), ...getSide("bl")];
    default:
      return [Sides[side]];
  }
}
