/**
 * Given a value with numbers, attempt to fix all numbers to 1 decimal point.
 */
export function fix<T>(n: T): T {
  if (typeof n === "number") {
    return +n.toFixed(1) as T;
  }
  if (n !== Object(n)) {
    // A primitive
    return n;
  }
  if (Array.isArray(n)) {
    return n.map(fix) as T;
  }
  // @ts-expect-error
  return mapreduce<T>(fix, n as Record<string, T>);
}

function mapreduce<T, U>(
  fn: (t: T) => U,
  iter: Record<string, T>,
): Record<string, U> {
  return Object.entries(iter).reduce(
    (acc, [k, v]) => {
      acc[k] = fn(v);
      return acc;
    },
    {} as Record<string, U>,
  );
}
