import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { encodeTextFrame, readOpcode } from "./frame.ts";
import { completeHandshake } from "./handshake.ts";

export interface WebSocketHub {
  // Send one text message to every live client. Encodes once via encodeTextFrame;
  // prunes any socket whose write throws.
  broadcast(text: string): void;
  // Live connection count (tests/diagnostics).
  readonly size: number;
  // End every socket and remove the 'upgrade' listener. Idempotent; leaves the
  // http.Server otherwise usable.
  close(): void;
}

export interface AttachOptions {
  // Only upgrade requests whose URL pathname equals this are accepted; others
  // have their socket destroyed.
  path: string;
  // Optional hook invoked after a socket completes the handshake.
  onConnection?: (socket: Duplex) => void;
}

// A pong control frame: FIN + opcode 0xA, empty unmasked payload.
const PONG_FRAME = Buffer.from([0x8a, 0x00]);

// Inbound control-frame opcodes the hub answers (RFC 6455 section 5.5).
const OPCODE_CLOSE = 0x8;
const OPCODE_PING = 0x9;

// Attaches a WebSocket hub to an existing http.Server via its 'upgrade' event.
// Does NOT create or own the server.
export function attachWebSocketServer(
  server: Server,
  options: AttachOptions,
): WebSocketHub {
  const sockets = new Set<Duplex>();

  const onUpgrade = (req: IncomingMessage, socket: Duplex) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (pathname !== options.path) {
      socket.destroy();
      return;
    }
    if (!completeHandshake(req, socket)) {
      socket.destroy();
      return;
    }

    sockets.add(socket);
    options.onConnection?.(socket);

    socket.on("data", (chunk: Buffer) => {
      const opcode = readOpcode(chunk);
      if (opcode === OPCODE_PING) {
        // A pong keeps the connection alive; an unanswered ping drops it.
        socket.write(PONG_FRAME);
      } else if (opcode === OPCODE_CLOSE) {
        sockets.delete(socket);
        socket.end();
      }
    });

    const remove = () => {
      sockets.delete(socket);
    };
    socket.on("error", remove);
    socket.on("end", remove);
    socket.on("close", remove);
  };

  server.on("upgrade", onUpgrade);

  return {
    broadcast(text: string): void {
      const frame = encodeTextFrame(text);
      for (const socket of sockets) {
        try {
          socket.write(frame);
        } catch {
          sockets.delete(socket);
        }
      }
    },
    get size(): number {
      return sockets.size;
    },
    close(): void {
      for (const socket of sockets) {
        socket.end();
      }
      sockets.clear();
      server.off("upgrade", onUpgrade);
    },
  };
}

export { encodeTextFrame, readOpcode } from "./frame.ts";
export { acceptKey, completeHandshake } from "./handshake.ts";
