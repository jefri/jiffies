/**
 * @param {number} start
 * @param {number} end
 * @param {number} stride
 * @returns {number[]}
 */
export function range(start, end, stride = 1) {
  const range = [];
  for (let i = start; i < end; i += stride) {
    range.push(i);
  }
  return range;
}
