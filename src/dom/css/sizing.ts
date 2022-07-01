import { Width, Widths } from "./constants"

export function width(amount: Width, block?: "inline") {
  if (amount === undefined && Widths[block as Width] !== undefined) {
    amount = block as Width;
  }
  return {
    ...(block === "inline" ? { display: "inline-block" } : {}),
    width: Widths[amount] ?? "0",
  };
}
