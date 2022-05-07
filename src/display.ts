export type Display =
  | string
  | {
      toString(): string;
    };

export const isDisplay = (/** @type unknown */ a: unknown): a is Display =>
  typeof (a as Display).toString === "function" ||
  typeof (a as Display) === "string";

export const display = (a: unknown | Display): string => {
  if (isDisplay(a)) {
    const str = a.toString();
    if (str === "[object Object]") return JSON.stringify(a);
    return str;
  }
  return JSON.stringify(a);
};
