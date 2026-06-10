import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

// The fixed GUID concatenated to the client key before hashing, per RFC 6455.
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

// base64( SHA-1( key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" ) ), per RFC 6455.
// Pure function of the client's Sec-WebSocket-Key.
export function acceptKey(secWebSocketKey: string): string {
  return createHash("sha1")
    .update(secWebSocketKey + WS_GUID)
    .digest("base64");
}

// Validates the upgrade request, writes the "101 Switching Protocols" response
// (Upgrade: websocket, Connection: Upgrade, Sec-WebSocket-Accept: acceptKey(...))
// to the raw socket, and returns true. Returns false WITHOUT writing on a
// malformed upgrade (missing/non-"websocket" Upgrade header or missing
// Sec-WebSocket-Key), leaving the socket for the caller to destroy.
export function completeHandshake(
  req: IncomingMessage,
  socket: Duplex,
): boolean {
  const key = req.headers["sec-websocket-key"];
  const upgrade = req.headers.upgrade;
  if (typeof key !== "string" || key.length === 0) {
    return false;
  }
  if (typeof upgrade !== "string" || upgrade.toLowerCase() !== "websocket") {
    return false;
  }

  const response =
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n" +
    `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n` +
    "\r\n";
  socket.write(response);
  return true;
}
