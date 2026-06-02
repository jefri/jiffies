import assert from "node:assert/strict";
import * as fsSync from "node:fs";
import type { IncomingMessage } from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { tsFileServer } from "./typescript.ts";

// Characterization test: tsFileServer strips TypeScript types for browser delivery.
//
// The server process itself runs on Node >=22 native type-stripping; ts-blank-space
// is kept exclusively for this browser-facing path. This test guards that boundary.

const FIXTURE_TS = `\
const x: number = 42;
export function greet(name: string): string {
  return \`hello \${name}\`;
}
`;

describe("tsFileServer", () => {
  let fixtureDir: string;

  before(() => {
    fixtureDir = fsSync.mkdtempSync(
      path.join(os.tmpdir(), "jiffies-typescript-"),
    );
    fsSync.writeFileSync(path.join(fixtureDir, "example.ts"), FIXTURE_TS);
  });

  after(() => {
    fsSync.rmSync(fixtureDir, { recursive: true });
  });

  it("strips TypeScript types and returns JavaScript for .ts requests", async () => {
    const middleware = await tsFileServer({ root: fixtureDir });
    const req = { url: "/example.ts" } as IncomingMessage;
    const handler = await middleware(req);

    assert.ok(handler !== undefined, "expected a handler for a .ts request");
    const response = await handler();

    assert.strictEqual(response.status, 200);
    assert.ok(
      response.contentType.includes("application/javascript"),
      `expected application/javascript, got ${response.contentType}`,
    );

    const body = response.content.toString("utf-8");

    // Types must be gone; ts-blank-space blanks them with spaces.
    assert.ok(!body.includes(": number"), "type annotation : number survived");
    assert.ok(!body.includes(": string"), "type annotation : string survived");

    // The runtime values must still be present.
    assert.ok(body.includes("const x"), "const x is missing");
    assert.ok(body.includes("function greet"), "function greet is missing");
    assert.ok(body.includes("hello"), "template literal body is missing");
  });

  it("returns undefined for non-JS/TS requests", async () => {
    const middleware = await tsFileServer({ root: fixtureDir });
    const req = { url: "/index.html" } as IncomingMessage;
    const handler = await middleware(req);
    assert.strictEqual(handler, undefined);
  });
});
