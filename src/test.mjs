#!/usr/bin/env node

import { parse } from "./flags"
import { execute } from "./scope/execute"
import { asXML } from "./scope/display/junit"
import { onConsole } from "./scope/display/console"

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