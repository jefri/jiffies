import { None, Ok, Option, Some } from "./result.js";

export const DiffA = Symbol("A");
export const DiffB = Symbol("B");

interface Diff {
  [DiffA]: string | number | boolean;
  [DiffB]: string | number | boolean;
  [k: string | number]: Diff;
}

export function diff<T>(a: Partial<T>, b: Partial<T>): Option<Diff> {
  return Some({
    [DiffA]: JSON.stringify(a),
    [DiffB]: JSON.stringify(b),
  });
  // // runtime type checking
  // switch (typeof a) {
  //   case "boolean" | "number" | "string":
  //     if (!Object.is(a, b)) {
  //       return Ok({ [DiffA]: a, [DiffB]: b });
  //     }
  //   case "object":
  //     if (b === undefined) {
  //       return Ok({ [DiffA]: "[object Object]", [DiffB]: "undefined" });
  //     }
  //     if (a instanceof Array && b instanceof Array) {
  //       return diffArrays(a, b);
  //     } else {
  //       return diffObjects(a, b);
  //     }
  //   default:
  // }
  // return None();
}
