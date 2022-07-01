#!/usr/bin/env node --experimental-loader ../loader.mjs

import { info } from "../log"
info("Starting server", { cwd: process.cwd() });

import { parse } from "../flags"
const FLAGS = parse(process.argv);

import { makeServer } from "./http/index"
import * as path from "node:path";

async function main() {
  const server = await makeServer({ root: path.join(process.cwd(), "src") });
  server.listen(FLAGS.asNumber("port", 8080), FLAGS.asString("host", "0.0.0.0"));
}

main();
