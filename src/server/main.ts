#!/usr/bin/env node --experimental-loader ../loader.mjs
import * as process from "node:process";

import { info } from "../log.ts";

info("Starting server", { cwd: process.cwd() });

import { parse } from "../flags.ts";

const FLAGS = parse(process.argv);

import * as path from "node:path";
import { makeServer } from "./http/index.ts";

async function main() {
  const server = await makeServer({ root: path.join(process.cwd(), "src") });
  server.listen(
    FLAGS.asNumber("port", 8080),
    FLAGS.asString("host", "0.0.0.0"),
  );
}

main();
