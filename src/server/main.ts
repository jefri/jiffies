#!/usr/bin/env node
import * as process from "node:process";

import { info } from "../log.ts";

info("Starting server", { cwd: process.cwd() });

import { parseArgs } from "node:util";

// Declared up front so an unknown flag fails fast: parseArgs defaults to
// strict: true, which throws on undeclared options. The throw happens at module
// top level (before main() listens), so a malformed invocation exits non-zero
// and never reaches the listening state. With no flags the defaults reproduce
// the prior bind target (0.0.0.0:8080).
const { values } = parseArgs({
  options: {
    port: { type: "string", default: "8080" },
    host: { type: "string", default: "0.0.0.0" },
  },
});

import * as path from "node:path";
import { makeServer } from "./http/index.ts";

async function main() {
  const server = await makeServer({ root: path.join(process.cwd(), "src") });
  server.listen(Number.parseInt(values.port, 10), values.host);
}

main();
