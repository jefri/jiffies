import { Properties } from "../types/css"
import { Side, Size } from "./constants"
import { isSide, getSize, getSide } from "./core"

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
  }, {} as Properties);
}

export function border({
  side = "",
  style = "solid",
  radius = "",
  width = 1,
  color = "black",
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
  color1: string = "gray",
  color2: string = "lightgray"
) {
  return {
    ...border({ side: "tl", width, color: color1, radius: "none" }),
    ...border({ side: "br", width, color: color2, radius: "none" }),
  };
}
