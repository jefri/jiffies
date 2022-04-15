import { Widths } from "./constants.js";

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
