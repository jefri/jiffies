#!/usr/bin/env node

import { parseArgs } from "node:util";
import { onConsole } from "./scope/display/console.ts";
import { asXML } from "./scope/display/junit.ts";
import { execute } from "./scope/execute.ts";

async function main() {
  await import("./test_all.ts");

  (async () => {
    const results = await execute();

    // The test runner selects its reporter from --mode (default "console").
    const { values } = parseArgs({
      options: { mode: { type: "string", default: "console" } },
    });

    switch (values.mode) {
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
