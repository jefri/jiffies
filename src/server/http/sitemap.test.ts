import assert from "node:assert/strict";
import * as fsSync from "node:fs";
import type { IncomingMessage } from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { sitemap } from "./sitemap.ts";

// Fixture layout:
//   index.html                   → /index.html
//   app1/index.html              → /app1/index.html
//   .hidden/index.html           → excluded (dotfile dir)
//   node_modules/pkg/index.html  → excluded (node_modules)

function buildFixture(base: string) {
  for (const rel of [
    "index.html",
    "app1/index.html",
    ".hidden/index.html",
    "node_modules/pkg/index.html",
  ]) {
    const full = path.join(base, rel);
    fsSync.mkdirSync(path.dirname(full), { recursive: true });
    fsSync.writeFileSync(full, "");
  }
}

describe("sitemap middleware", () => {
  let fixtureDir: string;

  before(() => {
    fixtureDir = fsSync.mkdtempSync(path.join(os.tmpdir(), "jiffies-sitemap-"));
    buildFixture(fixtureDir);
  });

  after(() => {
    fsSync.rmSync(fixtureDir, { recursive: true });
  });

  it("returns index paths excluding dotdirs and node_modules", async () => {
    const middleware = await sitemap({ root: fixtureDir });
    const req = { url: "/sitemap.json" } as IncomingMessage;
    const handler = await middleware(req);
    assert.ok(handler !== undefined);
    const response = await handler();
    const entries = JSON.parse(response.content.toString()) as string[];
    assert.deepStrictEqual(entries.sort(), ["/app1/index.html", "/index.html"]);
  });

  it("returns undefined for non-sitemap requests", async () => {
    const middleware = await sitemap({ root: fixtureDir });
    const req = { url: "/index.html" } as IncomingMessage;
    const handler = await middleware(req);
    assert.strictEqual(handler, undefined);
  });
});
