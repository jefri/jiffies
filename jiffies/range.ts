export function range(start: number, end: number, stride = 1): number[] {
  const range = [];
  for (let i = start; i < end; i += stride) {
    range.push(i);
  }
  return range;
}
