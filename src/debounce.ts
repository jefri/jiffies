export function debounce<CB extends (...args: unknown[]) => unknown>(
  fn: CB,
  ms = 32,
) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<CB>) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      clearTimeout(timer);
      return fn(...args);
    }, ms);
    return timer;
  };
}
