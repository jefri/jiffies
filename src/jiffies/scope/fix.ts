/**
 * Given a value with numbers, attempt to fix all numbers to 1 decimal point.
 */
export function fix<T>(n: T): T {
  if (typeof n === "number") {
    // @ts-ignore
    return +n.toFixed(1) as T;
  }
  if (n !== Object(n)) {
    // A primitive
    return n;
  }
  if (n instanceof Array) {
    // @ts-ignore
    return n.map(fix) as T;
  }
  // @ts-ignore
  return mapreduce<T>(fix, n as Record<string, T>);
}

function mapreduce<T, U>(
  fn: (t: T) => U,
  iter: Record<string, T>
): Record<string, U> {
  return Object.entries(iter).reduce(
    (acc, [k, v]) => ((acc[k] = fn(v)), acc),
    {} as Record<string, U>
  );
}
