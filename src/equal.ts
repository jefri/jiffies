export function compareArrays<T>(
  equal: (a: T, b: T) => boolean
): (A: T[], B: T[]) => boolean {
  return (a: T[], b: T[]): boolean =>
    a.length === b.length && a.every((e, i) => equal(e, b[i]));
}

export const equalArrays = compareArrays(Object.is);

export const matchArrays: <A>(a: A[], b: A[]) => boolean =
  compareArrays(equals);

function asArray(a: Record<string, unknown>): [string, unknown][] {
  return Object.entries(a).sort((a, b) => a[0].localeCompare(b[0]));
}

export const matchObjects = (a: {}, b: {}, strict = false) => {
  for (const [k, v] of Object.entries(a)) {
    if (strict && !b.hasOwnProperty(k)) return false;
    // @ts-ignore
    if (!equals(v, b[k])) return false;
  }
  return true;
};

export function equals<A>(a: A | A[], b: A | A[]): boolean {
  // runtime type checking
  switch (typeof a) {
    case "object":
      if (b === undefined) {
        return false;
      }
      if (a instanceof Array && b instanceof Array) {
        return matchArrays(a, b);
      } else {
        return matchObjects(a, b);
      }
    case "function":
      return a.name == (b as unknown as Function).name;
    default:
      return Object.is(a, b);
  }
}
