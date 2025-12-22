export function compareArrays<T>(
  equal: (a: T, b: T, partial: boolean) => boolean,
): (A: T[], B: T[], partial?: boolean) => boolean {
  return (a: T[], b: T[], partial = false): boolean =>
    a.length === b.length && a.every((e, i) => equal(e, b[i], partial));
}

export const equalArrays = compareArrays(Object.is);

// export const matchArrays: <T>(a: T[], b: T[], partial?: boolean) => boolean = compareArrays(equals);
export function matchArrays<T>(a: T[], b: T[], partial?: boolean): boolean {
  return compareArrays<T>(equals)(a, b, partial);
}

export function asArray<T = unknown>(a: Record<string, T>): [string, T][] {
  return Object.entries(a).sort((a, b) => a[0].localeCompare(b[0]));
}

export const matchObjects = (
  a: object,
  b: object & { [k: string]: unknown },
  partial = true,
) => {
  for (const [k, v] of Object.entries(a)) {
    if (!Object.hasOwn(b, k) && partial) continue;
    if (!equals(v, b[k], partial)) return false;
  }
  return true;
};

export function equals<T>(a: T, b: T, partial?: boolean): boolean;
export function equals<T>(a: T[], b: T[], partial?: boolean): boolean;
export function equals<T>(a: T | T[], b: T | T[], partial = false): boolean {
  // runtime type checking
  if (a === null && a === b) return true;
  if (a === undefined && a === b) return true;
  switch (typeof a) {
    case "object":
      if (b === undefined) {
        return false;
      }
      if (Array.isArray(a) && Array.isArray(b)) {
        return matchArrays(a, b, partial);
      }
      return matchObjects(
        a ?? {},
        // @ts-expect-error
        b,
        partial,
      );
    case "function":
      return a.name === (b as unknown as CallableFunction).name;
    default:
      return Object.is(a, b);
  }
}

// prettier-ignore
export type Equals<T1, T2> =
  (<T>() => T extends T2 ? true : false) extends <T>() => T extends T1
    ? true
    : false
    ? true
    : false;

export type Not<B extends boolean> = B extends true ? false : true;
