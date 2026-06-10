// Encodes `text` as a single unmasked server->client WebSocket text frame:
// FIN set + opcode 0x1 => first byte 0x81; mask bit clear; 7-bit / 16-bit /
// 64-bit extended payload-length selection by utf8 byte count. Server-to-client
// frames are never masked (RFC 6455).
export function encodeTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, "utf-8");
  const length = payload.length;
  const fin = 0x81; // FIN set, opcode 0x1 (text).

  let header: Buffer;
  if (length < 126) {
    header = Buffer.from([fin, length]);
  } else if (length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = fin;
    header[1] = 0x7e;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = fin;
    header[1] = 0x7f;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

// Reads the opcode nibble of an inbound (client, masked) frame for control-frame
// handling: 0x1 text, 0x8 close, 0x9 ping, 0xA pong, etc. Returns undefined for a
// partial/unreadable buffer. Does NOT decode the masked payload.
export function readOpcode(buffer: Buffer): number | undefined {
  if (buffer.length === 0) {
    return undefined;
  }
  return buffer[0] & 0x0f;
}
