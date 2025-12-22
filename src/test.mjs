#!/usr/bin/env node

import { parse } from "./flags.ts";
import { onConsole } from "./scope/display/console.ts";
import { asXML } from "./scope/display/junit.ts";
import { execute } from "./scope/execute.ts";

async function main() {
  await import("./test_all.ts");

  (async () => {
    const results = await execute();

    const FLAGS = parse(process.argv);

    switch (FLAGS.asString("mode", "console")) {
      case "junit": {
        const xml = asXML(results);
        console.log(xml);
        break;
      }
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
