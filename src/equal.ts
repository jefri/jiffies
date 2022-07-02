export function compareArrays<T>(
  equal: (a: T, b: T, partial: boolean) => boolean
): (A: T[], B: T[], partial?: boolean) => boolean {
  return (a: T[], b: T[], partial = false): boolean =>
    a.length === b.length && a.every((e, i) => equal(e, b[i], partial));
}

export const equalArrays = compareArrays(Object.is);

export const matchArrays: <A>(a: A[], b: A[], partial?: boolean) => boolean =
  compareArrays(equals);

function asArray(a: Record<string, unknown>): [string, unknown][] {
  return Object.entries(a).sort((a, b) => a[0].localeCompare(b[0]));
}

export const matchObjects = (a: {}, b: {}, partial = true) => {
  for (const [k, v] of Object.entries(a)) {
    if (!b.hasOwnProperty(k) && partial) continue;
    // @ts-ignore
    if (!equals(v, b[k], partial)) return false;
  }
  return true;
};

export function equals<A>(a: A | A[], b: A | A[], partial = false): boolean {
  // runtime type checking
  switch (typeof a) {
    case "object":
      if (b === undefined) {
        return false;
      }
      if (a instanceof Array && b instanceof Array) {
        return matchArrays(a, b, partial);
      } else {
        return matchObjects(a, b, partial);
      }
    case "function":
      return a.name === (b as unknown as Function).name;
    default:
      return Object.is(a, b);
  }
}
