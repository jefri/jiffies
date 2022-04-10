export interface Display {
  toString(): string;
}

export const isDisplay = (/** @type unknown */ a: unknown): a is Display =>
  typeof (a as Display).toString === "function";

export const display = (a: unknown | Display): string =>
  isDisplay(a) ? a.toString() : JSON.stringify(a);
