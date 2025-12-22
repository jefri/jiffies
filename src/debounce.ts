export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  ms = 32,
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      clearTimeout(timer);
      return fn(...args);
    }, ms);
    return timer;
  };
}
