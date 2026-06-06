#!/usr/bin/env node
/**
 * Demo server for the Jiffies hydration showcase.
 *
 * Run:  node demo/hydration/server.ts [--port 3000] [--host 127.0.0.1]
 *
 * Serves:
 *   GET /           — SSG-rendered HTML with hydration artifacts injected
 *   GET /<path>.ts  — TypeScript source transpiled to JavaScript
 *   GET /<path>.js  — JavaScript source as-is
 *
 * The server root is the project root, so browser imports like
 *   /src/dom/hydrate.ts  and  /demo/hydration/components.ts
 * are both resolved and served correctly.
 */
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { build } from "../../src/dom/ssg.ts";
import { FileSystem, RecordFileSystemAdapter } from "../../src/fs.ts";
import {
  type MiddlewareFactory,
  makeServer,
} from "../../src/server/http/index.ts";
import { contentResponse } from "../../src/server/http/response.ts";
import pageModule from "./page.ts";

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "3000" },
    host: { type: "string", default: "127.0.0.1" },
  },
});

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const files: Record<string, string> = {};
await build({
  pages: [{ route: "/", module: pageModule }],
  out: "",
  fs: new FileSystem(new RecordFileSystemAdapter(files)),
});

const INDEX_HTML = files["/index.html"] ?? "<h1>Build failed</h1>";
console.log(`[demo] HTML rendered (${INDEX_HTML.length} bytes)`);

// ── Custom middleware: serve SSG output at / ──────────────────────────────────

const indexPage: MiddlewareFactory = async () => async (req) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
  if (pathname === "/" || pathname === "/index.html") {
    return contentResponse(INDEX_HTML, "text/html");
  }
  return undefined;
};

// ── Start ─────────────────────────────────────────────────────────────────────

const server = await makeServer({ root: ROOT }, [indexPage]);

server.once("listening", () => {
  console.log("[demo] Disable JS, reload to see static HTML.");
  console.log("[demo] Re-enable JS to watch hydration.");
});

server.listen(Number.parseInt(values.port, 10), values.host);
