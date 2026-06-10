import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { describe, it } from "node:test";
import { acceptKey, completeHandshake } from "./handshake.ts";

// A minimal Duplex-shaped stub capturing written bytes.
function captureSocket(): { socket: Duplex; written(): string } {
  let buffer = "";
  const socket = {
    write(chunk: string | Buffer): boolean {
      buffer += typeof chunk === "string" ? chunk : chunk.toString("utf-8");
      return true;
    },
  } as unknown as Duplex;
  return { socket, written: () => buffer };
}

function upgradeRequest(
  headers: Record<string, string | undefined>,
): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

describe("acceptKey", () => {
  it("matches the canonical RFC 6455 vector", () => {
    assert.strictEqual(
      acceptKey("dGhlIHNhbXBsZSBub25jZQ=="),
      "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=",
    );
  });
});

describe("completeHandshake", () => {
  it("writes a 101 response with the computed accept header", () => {
    const { socket, written } = captureSocket();

    const ok = completeHandshake(
      upgradeRequest({
        upgrade: "websocket",
        "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
      }),
      socket,
    );

    assert.strictEqual(ok, true);
    const response = written();
    const lower = response.toLowerCase();
    assert.ok(response.includes("101"), "response missing 101 status");
    assert.ok(
      lower.includes("upgrade: websocket"),
      "response missing Upgrade: websocket",
    );
    assert.ok(
      response.includes("Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo="),
      "response missing the computed accept key",
    );
    assert.ok(
      response.endsWith("\r\n\r\n"),
      "response not blank-line terminated",
    );
  });

  it("returns false and writes nothing when the key is missing", () => {
    const { socket, written } = captureSocket();

    const ok = completeHandshake(
      upgradeRequest({ upgrade: "websocket" }),
      socket,
    );

    assert.strictEqual(ok, false);
    assert.strictEqual(written(), "");
  });
});
