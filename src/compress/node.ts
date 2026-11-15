// Node adapter for compress/index.ts. It runs the same CompressionStream based code as
// web.ts, over a CompressionStream and DecompressionStream polyfill backed by node:zlib.
// Only this file may import node:zlib. Nothing a browser loads imports it.
//
// zlib streams are more lenient than DecompressionStream, so the polyfilled
// DecompressionStream rejects bytes after the end of the zlib stream as the Web one does.

import { Duplex, Transform, type TransformCallback } from "node:stream";
import { createDeflate, createInflate, type Inflate } from "node:zlib";
import { makeCompressor } from "./web.ts";

type Pair = { readable: ReadableStream<Uint8Array>; writable: WritableStream };

function toWeb(stream: Duplex): Pair {
  return Duplex.toWeb(stream) as unknown as Pair;
}

/** Inflates a zlib stream and fails when input continues past its end. */
class ExactInflate extends Transform {
  #inflate: Inflate = createInflate();
  #written = 0;
  // zlib ends by itself at the end of the zlib stream, possibly before this stream is flushed.
  #ended: Promise<void>;

  constructor() {
    super();
    this.#ended = new Promise((resolve) => this.#inflate.once("end", resolve));
    this.#inflate.on("data", (chunk: Buffer) => this.push(chunk));
    this.#inflate.on("error", (error) => {
      this.destroy(error);
    });
  }

  override _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    this.#written += chunk.length;
    this.#inflate.write(chunk, (error) => callback(error));
  }

  override _flush(callback: TransformCallback) {
    this.#inflate.end();
    this.#ended.then(() => {
      if (this.#inflate.bytesWritten !== this.#written) {
        callback(new TypeError("Junk found after end of compressed data."));
      } else callback();
    });
  }
}

/** A CompressionStream for the "deflate" format, backed by node:zlib. */
export class ZlibCompressionStream {
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream;

  constructor(format: "deflate") {
    if (format !== "deflate") {
      throw new TypeError(`Unsupported compression format: ${format}`);
    }
    ({ readable: this.readable, writable: this.writable } = toWeb(
      createDeflate(),
    ));
  }
}

/** A DecompressionStream for the "deflate" format, backed by node:zlib. */
export class ZlibDecompressionStream {
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream;

  constructor(format: "deflate") {
    if (format !== "deflate") {
      throw new TypeError(`Unsupported compression format: ${format}`);
    }
    ({ readable: this.readable, writable: this.writable } = toWeb(
      new ExactInflate(),
    ));
  }
}

const compressor = makeCompressor({
  CompressionStream: ZlibCompressionStream as never,
  DecompressionStream: ZlibDecompressionStream as never,
});

/** Compresses UTF-8 text as a zlib stream and encodes it as unpadded base64url. */
export const deflate = compressor.deflate;

/** Decodes base64url or standard base64 and inflates the zlib stream to text. */
export const inflate = compressor.inflate;
