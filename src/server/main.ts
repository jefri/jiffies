#!/usr/bin/env node --experimental-loader ../loader.mjs

import { info } from "../jiffies/log.js";
info("Starting server", { cwd: process.cwd() });

import { parse } from "../jiffies/flags.js";
const FLAGS = parse(process.argv);

import { makeServer } from "./http/index.js";

const server = makeServer();
server.listen(FLAGS.asNumber("port", 8080), FLAGS.asString("host", "0.0.0.0"));
