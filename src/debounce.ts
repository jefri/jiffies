export function debounce(fn: (...args: any[]) => any, ms = 32) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<typeof fn>): ReturnType<typeof fn> => {
    clearTimeout(timer);
    timer = setTimeout(() => (clearTimeout(timer), fn(...args)), ms);
  };
}
