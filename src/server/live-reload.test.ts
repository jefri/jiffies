import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { ignoreDefault, startWatchServer } from "./live-reload.ts";

// User story (moved from resume's scripts/live-reload.feature.test.ts): running a
// watched jiffies static server, saving one edit to a watched source file reloads
// the open browser exactly once, and a generated file the build writes back into a
// watched dir (and that the ignore predicate excludes) reloads it zero times.
// Exercised browser-free over a real Node global WebSocket client: the reload is a
// WebSocket push from the hub attached at reloadPath. This single end-to-end test
// is the behavior-parity guarantee for the upstream move — the same edit drives the
// same single push, and an ignored write drives none, with no reload loop.

const RELOAD_PATH = "/__livereload";

let cleanup: (() => Promise<void>) | undefined;
const openSockets: WebSocket[] = [];

afterEach(async () => {
  for (const ws of openSockets.splice(0)) {
    try {
      ws.close();
    } catch {}
  }
  await cleanup?.();
  cleanup = undefined;
});

// Opens a client WebSocket to the watch server's reload path and resolves once it
// is open. Rejects fast on error or after `timeoutMs` so a missing upgrade endpoint
// fails the test instead of hanging. Tracked for afterEach teardown.
function connectReloadSocket(
  port: number,
  timeoutMs = 4000,
): Promise<WebSocket> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${RELOAD_PATH}`);
  openSockets.push(ws);
  return new Promise<WebSocket>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`WebSocket did not open within ${timeoutMs}ms`));
    }, timeoutMs);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("WebSocket connection errored before opening"));
    });
  });
}

describe("startWatchServer end-to-end live reload", () => {
  it("pushes exactly one reload for a real watched edit and none from an ignored generated write", async () => {
    // Arrange: a real temp dir tree — docs/ served, src/ + public/ watched. The
    // fake build writes a generated file back into a watched dir (like css:bundle
    // writing public/global.css); the ignore predicate excludes exactly that path
    // and composes with ignoreDefault, mirroring resume's serve.ts wiring.
    const base = await mkdtemp(join(tmpdir(), "lr-"));
    const docs = join(base, "docs");
    const src = join(base, "src");
    const pub = join(base, "public");
    await mkdir(docs, { recursive: true });
    await mkdir(src, { recursive: true });
    await mkdir(pub, { recursive: true });
    await writeFile(
      join(docs, "index.html"),
      "<!doctype html><html><body><h1>hi</h1></body></html>",
    );
    await writeFile(join(src, "page.ts"), "export const x = 1;\n");

    const generated = join(pub, "global.css");
    const server = await startWatchServer({
      root: docs,
      watchDirs: [src, pub],
      ignore: (file) => file === generated || ignoreDefault(file),
      rebuild: async () => {
        // The build writes a generated file back into a watched dir; the ignore
        // predicate must keep that write from retriggering a rebuild.
        await writeFile(generated, "/* built */");
        return true;
      },
      debounceMs: 20,
      port: 0,
      host: "127.0.0.1",
      reloadPath: RELOAD_PATH,
    });
    cleanup = server.close;

    // Pages carry the WebSocket client snippet bound to reloadPath that drives the
    // reload, so an open browser would reconnect and reload on push.
    const page = await fetch(`http://127.0.0.1:${server.port}/`).then((r) =>
      r.text(),
    );
    assert.match(page, new RegExp(RELOAD_PATH));
    assert.match(page, /new WebSocket/);
    assert.match(page, /location\.reload/);

    // Open a real client WebSocket and count every reload pushed over it.
    const ws = await connectReloadSocket(server.port);
    let messages = 0;
    ws.addEventListener("message", () => {
      messages += 1;
    });

    // Act: one real edit to a non-ignored watched file.
    await writeFile(join(src, "page.ts"), "export const x = 2;\n");

    // Assert: exactly one reload arrives for the real edit.
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      if (messages >= 1) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.strictEqual(messages, 1, "one reload per real edit");

    // The rebuild wrote the ignored generated file. If that write retriggered the
    // build a second reload would arrive; assert none does within a settle window.
    // Exactly one message per real edit, zero from the ignored generated write.
    await new Promise((r) => setTimeout(r, 500));
    assert.strictEqual(
      messages,
      1,
      "no reload from the ignored generated write",
    );
  });
});
