import { Side, Sides, Size, Sizes } from "./constants.js";

export function isSide(v: string): v is Side {
  return Sides[v as keyof typeof Sides] !== undefined;
}

export function isSize(v: string): v is Size {
  return Sizes[v as keyof typeof Sizes] !== undefined;
}

export function getSize(size: keyof typeof Sizes) {
  return Sizes[size];
}

export function getSide(side: Side): string[] {
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
