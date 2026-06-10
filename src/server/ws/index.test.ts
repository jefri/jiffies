import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import { attachWebSocketServer } from "./index.ts";

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function withDeadline<T>(promise: Promise<T>, ms: number, label: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout: ${label}`)), ms).unref(),
    ),
  ]);
}

describe("attachWebSocketServer", () => {
  it("completes the handshake and broadcasts to a connected client", async () => {
    const server = createServer((_req, res) => res.end());
    const hub = attachWebSocketServer(server, { path: "/__livereload" });
    const port = await listen(server);

    const ws = new WebSocket(`ws://127.0.0.1:${port}/__livereload`);
    const received: string[] = [];
    const gotMessage = new Promise<void>((resolve) => {
      ws.addEventListener("message", (event) => {
        received.push(String(event.data));
        resolve();
      });
    });

    await withDeadline(
      new Promise<void>((resolve, reject) => {
        ws.addEventListener("open", () => resolve());
        ws.addEventListener("error", () => reject(new Error("ws errored")));
      }),
      2000,
      "open",
    );

    assert.strictEqual(hub.size, 1, "hub should track the live socket");

    hub.broadcast("reload");
    await withDeadline(gotMessage, 2000, "message");
    assert.deepStrictEqual(received, ["reload"]);

    ws.close();
    hub.close();
    await closeServer(server);
    assert.strictEqual(hub.size, 0, "hub should be empty after close");
  });

  it("destroys upgrade sockets on a non-matching path", async () => {
    const server = createServer((_req, res) => res.end());
    const hub = attachWebSocketServer(server, { path: "/__livereload" });
    const port = await listen(server);

    const ws = new WebSocket(`ws://127.0.0.1:${port}/wrong`);
    const errored = await withDeadline(
      new Promise<boolean>((resolve) => {
        ws.addEventListener("open", () => resolve(false));
        ws.addEventListener("error", () => resolve(true));
        ws.addEventListener("close", () => resolve(true));
      }),
      2000,
      "non-matching path resolution",
    );

    assert.strictEqual(errored, true, "client should not open on a wrong path");
    assert.strictEqual(hub.size, 0, "hub should track no sockets");

    hub.close();
    await closeServer(server);
  });
});
