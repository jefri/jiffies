import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { inflateSync } from "node:zlib";
import { deflate, inflate } from "./index.ts";
import { deflate as nodeDeflate, inflate as nodeInflate } from "./node.ts";

const TEXT = "digraph { a -> b; /* ✓ é 日本語 😀 */ }";
const BASE64URL = /^[A-Za-z0-9_-]*$/;

describe("compress web facade", () => {
  it("round trips unicode and emits URL-safe zlib data", async () => {
    const encoded = await deflate(TEXT);
    assert.match(encoded, BASE64URL);
    assert.equal(
      new TextDecoder().decode(inflateSync(Buffer.from(encoded, "base64url"))),
      TEXT,
    );
    assert.equal(await inflate(encoded), TEXT);
  });

  it("reads Node output and rejects malformed input", async () => {
    assert.equal(await inflate(await nodeDeflate(TEXT)), TEXT);
    await assert.rejects(inflate("not base64!!"));
    await assert.rejects(nodeInflate("not base64!!"));
  });

  it("has no static path to the Node adapter", async () => {
    const source = await readFile(
      new URL("./index.ts", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(source, /node\.ts|node:zlib/);
  });
});
