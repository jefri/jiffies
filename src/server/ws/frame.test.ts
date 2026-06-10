import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeTextFrame, readOpcode } from "./frame.ts";

describe("encodeTextFrame", () => {
  it("encodes a short payload with a 7-bit length", () => {
    const frame = encodeTextFrame("reload");

    assert.strictEqual(
      frame[0],
      0x81,
      "first byte should be FIN + text opcode",
    );
    assert.strictEqual(frame[1], 6, "length byte should equal the byte count");
    assert.strictEqual(frame[1] & 0x80, 0, "mask bit should be clear");
    assert.deepStrictEqual(
      frame.subarray(2),
      Buffer.from("reload", "utf-8"),
      "tail should be the UTF-8 payload",
    );
  });

  it("encodes a 126..65535 payload with a 16-bit big-endian length", () => {
    const frame = encodeTextFrame("a".repeat(200));

    assert.strictEqual(frame[0], 0x81);
    assert.strictEqual(frame[1], 0x7e, "length flag should be 0x7E");
    assert.strictEqual(frame[2], 0x00, "high length byte");
    assert.strictEqual(frame[3], 0xc8, "low length byte (200)");
    assert.strictEqual(frame.length, 4 + 200);
  });

  it("encodes a >65535 payload with a 64-bit big-endian length", () => {
    const size = 70000;
    const frame = encodeTextFrame("a".repeat(size));

    assert.strictEqual(frame[0], 0x81);
    assert.strictEqual(frame[1], 0x7f, "length flag should be 0x7F");
    assert.strictEqual(
      Number(frame.readBigUInt64BE(2)),
      size,
      "64-bit big-endian length",
    );
    assert.strictEqual(frame.length, 10 + size);
  });

  it("counts UTF-8 bytes, not characters", () => {
    // "é" is 2 UTF-8 bytes.
    const frame = encodeTextFrame("é");
    assert.strictEqual(frame[1], 2);
  });
});

describe("readOpcode", () => {
  it("reads the ping opcode 0x9", () => {
    assert.strictEqual(readOpcode(Buffer.from([0x89, 0x00])), 0x9);
  });

  it("reads the close opcode 0x8", () => {
    assert.strictEqual(readOpcode(Buffer.from([0x88])), 0x8);
  });

  it("returns undefined for an empty buffer", () => {
    assert.strictEqual(readOpcode(Buffer.from([])), undefined);
  });
});
