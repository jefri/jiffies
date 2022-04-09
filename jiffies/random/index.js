/** @type {(size: number) => Uint8Array} */
const getUint8Array = typeof window === "undefined" ? (size) => {
	// const bytes = require("crypto").randomBytes(size | 0);
	const bytes = (Math.random() * Math.pow(2, 32)) & 0xffffffff;
	return new Uint8Array(bytes);
} : (size) => {
	const array = new Uint8Array(size);
	window.crypto.getRandomValues(array);
	return array;
};

export function randomByte() {
	const array = getUint8Array(1);
	return [].slice.call(array)[0];
}
