// Web adapter for compress/index.ts, ported from Agathon. Uses CompressionStream and
// DecompressionStream, which exist in browsers and in Node. Nothing here imports
// compress/index.ts, so the browser module graph never reaches node:zlib.

import type { Compressor } from "./types.ts";

/** Constructors for the two stream classes. The default is the platform's. */
export interface StreamClasses {
  CompressionStream: new (format: "deflate") => CompressionStream;
  DecompressionStream: new (format: "deflate") => DecompressionStream;
}

async function transform(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  // atob accepts input without padding, so no padding is restored. Input that is already in the
  // standard alphabet passes through the replacements unchanged.
  const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Builds deflate and inflate on top of the given stream classes. */
export function makeCompressor(classes: StreamClasses): Compressor {
  return {
    async deflate(text) {
      const bytes = new TextEncoder().encode(text);
      return toBase64Url(
        await transform(bytes, new classes.CompressionStream("deflate")),
      );
    },
    async inflate(encoded) {
      const bytes = await transform(
        fromBase64Url(encoded),
        new classes.DecompressionStream("deflate"),
      );
      return new TextDecoder().decode(bytes);
    },
  };
}

/** Compresses UTF-8 text as a zlib stream and encodes it as unpadded base64url. */
export function deflate(text: string): Promise<string> {
  return makeCompressor(globalThis).deflate(text);
}

/** Decodes base64url or standard base64 and inflates the zlib stream to text. */
export function inflate(encoded: string): Promise<string> {
  return makeCompressor(globalThis).inflate(encoded);
}
