// Node adapter for compress/index.ts, built on node:zlib and Buffer. Only this file
// may import node:zlib. Nothing a browser loads imports it.
//
// Buffer and inflateSync are more lenient than atob and DecompressionStream, so
// inflate parses its input with the rules atob uses and rejects bytes after the
// end of the zlib stream. Each version then rejects the same inputs.

import { deflate as deflateZlib, inflate as inflateZlib } from "node:zlib";

const ASCII_WHITESPACE = /[\t\n\f\r ]/g;
const BASE64_EITHER_ALPHABET = /^[A-Za-z0-9+/_-]*$/;

/**
 * Parses base64url or standard base64 into bytes with the forgiving base64
 * rules that atob applies. It strips ASCII whitespace and allows up to two
 * padding characters when the length is a multiple of four. It throws on any
 * other character or on a length that leaves one character over.
 */
function decodeBase64(encoded: string): Buffer {
  let data = encoded.replace(ASCII_WHITESPACE, "");
  if (data.length % 4 === 0) data = data.replace(/={1,2}$/, "");
  if (data.length % 4 === 1 || !BASE64_EITHER_ALPHABET.test(data)) {
    throw new SyntaxError("The string is not correctly encoded as base64.");
  }
  return Buffer.from(data, "base64");
}

interface InflateInfo {
  buffer: Buffer;
  engine: { bytesWritten: number };
}

/**
 * Inflates one complete zlib stream. It throws when bytes follow the end of
 * the stream, which inflateSync otherwise ignores.
 */
async function inflateExactly(bytes: Buffer): Promise<Buffer> {
  const { buffer, engine } = (await new Promise<unknown>((resolve, reject) => {
    inflateZlib(bytes, { info: true }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  })) as InflateInfo;
  if (engine.bytesWritten !== bytes.length) {
    throw new TypeError("Junk found after end of compressed data.");
  }
  return buffer;
}

/** Compresses UTF-8 text as a zlib stream and encodes it as unpadded base64url. */
export async function deflate(text: string): Promise<string> {
  const compressed = await new Promise<Buffer>((resolve, reject) => {
    deflateZlib(Buffer.from(text, "utf8"), (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
  return compressed.toString("base64url");
}

/** Decodes base64url or standard base64 and inflates the zlib stream to text. */
export async function inflate(encoded: string): Promise<string> {
  // TextDecoder drops a leading byte order mark as the Web version does. Buffer#toString keeps it.
  return new TextDecoder().decode(await inflateExactly(decodeBase64(encoded)));
}
