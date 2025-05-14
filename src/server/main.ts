#!/usr/bin/env node --experimental-loader ../loader.mjs
import * as process from "node:process";

import { info } from "../log.js";
info("Starting server", { cwd: process.cwd() });

import { parse } from "../flags.js";
const FLAGS = parse(process.argv);

import * as path from "node:path";
import { makeServer } from "./http/index.js";

async function main() {
  const server = await makeServer({ root: path.join(process.cwd(), "src") });
  server.listen(
    FLAGS.asNumber("port", 8080),
    FLAGS.asString("host", "0.0.0.0"),
  );
}

main();
