import { Side, Size } from "./constants.js";
import { isSide, getSize, getSide } from "./core.js";

export function rounded(size: Size = "", side: Side = "") {
  if (isSide(size)) {
    side = size;
    size = "";
  }
  const sized = getSize(size);
  return getSide(side).reduce((prev, curr) => {
    if (curr === "") {
      prev.borderRadius = sized;
    } else {
      // @ts-ignore
      prev[`border${curr}Radius`] = sized;
    }
    return prev;
  }, {} as CSSStyleDeclaration);
}

export function border({
  side = "",
  style = "solid",
  radius = "",
  width = 1,
  color = "black",
}: {
  side?: import("./constants.js").Side;
  style?: "solid" | "dotted" | "dashed" | "double" | "none";
  radius?: import("./constants.js").Size;
  width?: 0 | 1 | 2 | 4 | 8;
  color?: string;
}) {
  return {};
}

export function inset(
  /** @type 0|1|2|4|8 */ width,
  /** @type string */ color1 = "gray",
  /** @type string */ color2 = "lightgray"
) {
  return {
    ...border({ side: "tl", width, color: color1, radius: "none" }),
    ...border({ side: "br", width, color: color2, radius: "none" }),
  };
}
