export type Display =
  | string
  | {
      toString(): string;
    };

export const isDisplay = (/** @type unknown */ a: unknown): a is Display =>
  typeof (a as Display).toString === "function" ||
  typeof (a as Display) === "string";

export const display = (a: unknown | Display): string =>
  isDisplay(a) ? a.toString() : JSON.stringify(a);
