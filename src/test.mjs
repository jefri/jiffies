#!/usr/bin/env node

import { parse } from "./flags.js";
import { execute } from "./scope/execute.js";
import { asXML } from "./scope/display/junit.js";
import { onConsole } from "./scope/display/console.js";

async function main() {
  await import("./test_all.js");

  (async function () {
    const results = await execute();

    const FLAGS = parse(process.argv);

    switch (FLAGS.asString("mode", "console")) {
      case "junit":
        const xml = asXML(results);
        console.log(xml);
        break;
      case "console":
      default:
        onConsole(results);
        break;
    }

    if (results.failed > 0) {
      process.exit(1);
    }
  })();
}

main();
