import assert from "node:assert/strict";
import { it } from "node:test";
import { setImmediate } from "node:timers/promises";
import { inflateSync } from "node:zlib";
import * as node from "./node.ts";
import * as web from "./web.ts";

// Given the public package import selects Node, compressing a link leaves the
// event loop available and produces a link the Web adapter can also read.
it("selects Node without blocking compression and preserves Web interoperability", async () => {
  assert.equal(
    import.meta.resolve("@davidsouther/jiffies/compress/index.ts"),
    new URL("../../lib/esm/compress/node.js", import.meta.url).href,
  );
  const text = "digraph { a -> b; /* ✓ é 日本語 😀 */ }".repeat(100_000);
  const pending = node.deflate(text);
  let completed = false;
  void pending.then(() => {
    completed = true;
  });
  await setImmediate();
  assert.equal(completed, false, "zlib must leave the event loop available");
  const link = await pending;
  assert.match(link, /^[A-Za-z0-9_-]*$/);
  assert.equal(inflateSync(Buffer.from(link, "base64url")).toString(), text);
  assert.equal(await web.inflate(link), text);
  assert.equal(await node.inflate(await web.deflate("✓")), "✓");
});
