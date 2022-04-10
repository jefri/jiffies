export function* takeWhile<T>(
  predicate: (t: T) => boolean,
  iterator: Iterable<T>
) {
  for (const x of iterator) {
    if (predicate(x)) {
      yield x;
    } else {
      return;
    }
  }
}
