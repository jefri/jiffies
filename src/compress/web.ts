// Web adapter for compress/index.ts, ported from Agathon. Uses CompressionStream and
// DecompressionStream, which exist in browsers and in Node. Nothing here imports
// compress/index.ts, so the browser module graph never reaches node:zlib.

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

function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  // atob accepts input without padding, so no padding is restored. Input that is already in the
  // standard alphabet passes through the replacements unchanged.
  const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Compresses UTF-8 text as a zlib stream and encodes it as unpadded base64url. */
export async function deflate(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  return toBase64Url(await transform(bytes, new CompressionStream("deflate")));
}

/** Decodes base64url or standard base64 and inflates the zlib stream to text. */
export async function inflate(encoded: string): Promise<string> {
  const bytes = await transform(
    fromBase64Url(encoded),
    new DecompressionStream("deflate"),
  );
  return new TextDecoder().decode(bytes);
}
