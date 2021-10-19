const Hex = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

/**
 * @param {number} i
 * @returns {string}
 */
export function chars(i) {
  return Hex[i] ?? "X";
}

/**
 * @param {number} i
 * @returns {string}
 */
export function bits(i) {
  switch (i) {
    case 0x0:
      return "0000";
    case 0x1:
      return "0001";
    case 0x2:
      return "0010";
    case 0x3:
      return "0011";
    case 0x4:
      return "0100";
    case 0x5:
      return "0101";
    case 0x6:
      return "0110";
    case 0x7:
      return "0111";
    case 0x8:
      return "1000";
    case 0x9:
      return "1001";
    case 0xa:
      return "1010";
    case 0xb:
      return "1011";
    case 0xc:
      return "1100";
    case 0xd:
      return "1101";
    case 0xe:
      return "1110";
    case 0xf:
      return "1111";
    default:
      return "erro";
  }
}

/**
 * @param {string} n
 * @param {number}  radix
 * @returns {number}
 */
function int(n, radix) {
  let i = parseInt(n.replace(/[^\d+-.xa-fA-F]/g, ""), radix);
  i = i & 0xffff;
  if (i & 0x8000) {
    return -((~i + 1) & 0xffff);
  }
  return i;
}

/**
 * @param {string} i
 * @returns {number}
 */
export function int16(i) {
  return int(i, 16);
}

/**
 * @param {string} i
 * @returns {number}
 */
export function int10(i) {
  return int(i, 10);
}

/**
 * @param {string} i
 * @returns {number}
 */
export function int2(i) {
  return int(i, 2);
}

/**
 * @param {number} i
 * @returns {string}
 */
export function hex(i) {
  const hu = chars((i & 0xf000) >> 12);
  const hl = chars((i & 0x0f00) >> 8);
  const lu = chars((i & 0x00f0) >> 4);
  const ll = chars(i & 0x000f);

  return `0x${hu}${hl}${lu}${ll}`;
}

/**
 * @param {number} i
 * @returns {string}
 */
export function bin(i) {
  const hu = bits((i & 0xf000) >> 12);
  const hl = bits((i & 0x0f00) >> 8);
  const lu = bits((i & 0x00f0) >> 4);
  const ll = bits(i & 0x000f);

  return `${hu} ${hl} ${lu} ${ll}`;
}

/**
 * @param {number} i
 * @returns {string}
 */
export function dec(i) {
  const s = Math.sign(i) === -1 ? "-" : "";
  i = Math.abs(i);
  return `${s}${i}`;
}
