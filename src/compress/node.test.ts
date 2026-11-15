import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";
import { deflateSync } from "node:zlib";
import { deflate as nodeDeflate, inflate as nodeInflate } from "./node.ts";
import { deflate as webDeflate, inflate as webInflate } from "./web.ts";

const TEXT = "digraph { a -> b; /* ✓ é 日本語 😀 */ }";

type Outcome = { text: string } | { rejected: true };

async function outcome(
  inflate: (encoded: string) => Promise<string>,
  input: string,
): Promise<Outcome> {
  return inflate(input).then(
    (text) => ({ text }),
    () => ({ rejected: true }),
  );
}

function insert(link: string, at: number, extra: string): string {
  return `${link.slice(0, at)}${extra}${link.slice(at)}`;
}

const bytes = deflateSync(TEXT);
const standard = bytes.toString("base64");
const url = bytes.toString("base64url");

const parityInputs: [string, string][] = [
  ["base64url", url],
  ["standard base64 padded", standard],
  ["standard base64 unpadded", standard.replace(/=+$/, "")],
  ["mixed alphabets", standard.replace("+", "-")],
  ["a stray !", insert(url, 10, "!")],
  ["an inserted space", insert(url, 10, " ")],
  ["an inserted newline", insert(url, 10, "\n")],
  [
    "stray bytes after the stream",
    Buffer.concat([bytes, Buffer.from([1, 2, 3, 4])]).toString("base64url"),
  ],
  [
    "a second stream after the first",
    Buffer.concat([bytes, deflateSync("again")]).toString("base64url"),
  ],
  [
    "a truncated stream",
    bytes.subarray(0, bytes.length - 4).toString("base64url"),
  ],
  ["the empty string", ""],
  ["a", "a"],
  ["ab=", "ab="],
  ["ab==", "ab=="],
  ["a===", "a==="],
  ["AAAA", "AAAA"],
  ["not base64!!", "not base64!!"],
  [
    "a leading byte order mark",
    deflateSync(Buffer.from("﻿abc")).toString("base64url"),
  ],
];

describe("compress node parity with web", () => {
  for (const [label, input] of parityInputs) {
    it(`agrees on ${label}`, async () => {
      assert.deepEqual(
        await outcome(nodeInflate, input),
        await outcome(webInflate, input),
      );
    });
  }

  it("agrees on a lone surrogate round tripped through each deflate", async () => {
    const text = "a\uD800b";
    const fromNode = await nodeInflate(await nodeDeflate(text));
    const fromWeb = await webInflate(await webDeflate(text));
    assert.equal(fromNode, fromWeb);
    assert.equal(fromNode, "a�b");
  });

  it("rejects invalid input with a promise instead of a synchronous throw", async () => {
    const inflating = nodeInflate("!");
    assert.ok(inflating instanceof Promise);
    await assert.rejects(inflating);
  });

  it("yields to the event loop while compressing", async () => {
    const pending = nodeDeflate("a -> b;\\n".repeat(1_000_000));
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await setImmediate();
    assert.equal(settled, false);
    await pending;
  });
});
