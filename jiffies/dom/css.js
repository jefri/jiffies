const Sizes = {
  none: "0px",
  sm: "0.125rem",
  "": "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
};
const Sides = {
  "": "",
  t: "top",
  r: "right",
  l: "left",
  b: "bottom",
  tl: "top-left",
  tr: "top-right",
  bl: "bottom-left",
  br: "bottom-right",
};

/** @typedef {keyof typeof Sizes} Size */
/** @typedef {keyof typeof Sides} Side */

/** @returns {v is Side} */
function isSide(/** @type {string} */ v) {
  return Sides[v] !== undefined;
}

/** @returns {v is Size} */
function isSize(/** @type {string} */ v) {
  return Sizes[v] !== undefined;
}

function getSize(/** @type {Size} */ size) {
  return Sizes[size];
}

/** @returns {string[]} */
function getSide(/** @type {Side} */ side) {
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

/**
 * @param {Side|Size=} size
 * @param {Side=} side
 */
export function rounded(size = "", side = "") {
  if (isSide(size)) {
    side = size;
    size = "";
  }
  const sized = getSize(size);
  return getSide(side).reduce((prev, curr) => {
    if (curr === "") {
      prev["border-radius"] = sized;
    } else {
      prev[`border-${curr}-radius`] = sized;
    }
    return prev;
  }, /** @type Record<string, string> */ ({}));
}

const Widths = {
  "1/4": "25%",
  "1/2": "50%",
  "3/4": "75%",
  full: "100%",
};

export function width(
  /** @type {keyof Widths} */ amount,
  /** @type {"inline"=} */ block
) {
  if (
    amount === undefined &&
    Widths[/** @type keyof Widths */ (block)] !== undefined
  ) {
    amount = /** @type keyof Widths */ (block);
  }
  return {
    ...(block === "inline" ? { display: "inline-block" } : {}),
    width: Widths[amount] ?? "0",
  };
}

/** @param {'left'|'center'|'right'|'justify'} align */
export function text(align) {
  return { "text-align": align };
}
