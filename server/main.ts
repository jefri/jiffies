#!/usr/bin/env node --experimental-loader ../loader.mjs

import { parse } from "../jiffies/flags.js";
import { makeServer } from "./http/index.js";

const FLAGS = parse(process.argv);
console.log(`Starting in ${process.cwd()}`);
const server = makeServer();
server.listen(FLAGS.asNumber("port", 8080), FLAGS.asString("host", "0.0.0.0"));
