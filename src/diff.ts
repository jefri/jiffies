import { range } from "./range.js";
import { isSome, None, Option, Some } from "./result.js";

export const DiffA = Symbol("A");
export const DiffB = Symbol("B");

export type DiffIndex = string | number;
export type DiffPrimitive = string | number | boolean | null | undefined;

interface DiffEntry {
  key: DiffIndex;
  left: DiffPrimitive;
  right: DiffPrimitive;
}

interface DiffList {
  key: DiffIndex;
  children: (DiffEntry | DiffList)[];
}

function doDiff<T>(va: T, vb: T, k: DiffIndex): Option<DiffList | DiffEntry> {
  if (Array.isArray(va)) {
    // @ts-ignore
    return diffArray(va, vb, k);
  }
  if (typeof va == "object") {
    const d = diffObject(va, vb, k);
    if (d.children.length == 0) {
      return None();
    } else {
      return Some(d);
    }
  }
  if (Object.is(va, vb)) {
    return None();
  } else {
    // @ts-ignore
    return { key: k, left: va, right: vb };
  }
}

function diffArray<T>(
  a: Partial<T>[],
  b: Partial<T>[],
  key: DiffIndex
): Option<DiffList> {
  const indexes = Math.max(a.length, b.length);
  const children = range(0, indexes)
    .map((i) => doDiff(a[i], b[i], i))
    .filter(isSome);
  return children.length > 0 ? { key, children } : None();
}

function diffObject<T>(
  a: Partial<T>,
  b: Partial<T>,
  key: DiffIndex = ""
): DiffList {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const children = [...keys]
    // @ts-ignore
    .map((k) => doDiff(a[k], b[k], k))
    .filter(isSome);
  return {
    key,
    children,
  };
}

export function diff<T>(
  a: Partial<T>,
  b: Partial<T>
): (DiffEntry | DiffList)[] {
  return (
    Array.isArray(a)
      ? // @ts-ignore
        diffArray(a, b, "") ?? { children: [] }
      : diffObject(a, b, "")
  ).children;
}
