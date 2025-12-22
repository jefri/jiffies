import type { Properties } from "../types/css.ts";
import type { Side, Size } from "./constants.ts";
import { getSide, getSize, isSide } from "./core.ts";

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
      // @ts-expect-error
      prev[`border${curr}Radius`] = sized;
    }
    return prev;
  }, {} as Properties);
}

export function border({
  side: _side = "",
  style: _style = "solid",
  radius: _radius = "",
  width: _width = 1,
  color: _color = "black",
}: {
  side?: Side;
  style?: "solid" | "dotted" | "dashed" | "double" | "none";
  radius?: Size;
  width?: 0 | 1 | 2 | 4 | 8;
  color?: string;
}) {
  return {};
}

export function inset(
  width: 0 | 1 | 2 | 4 | 8,
  color1 = "gray",
  color2 = "lightgray",
) {
  return {
    ...border({ side: "tl", width, color: color1, radius: "none" }),
    ...border({ side: "br", width, color: color2, radius: "none" }),
  };
}
