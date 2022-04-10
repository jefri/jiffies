#!/usr/bin/env node

import { parse } from "./jiffies/flags.js";
import { execute } from "./jiffies/scope/execute.js";
import { asXML } from "./jiffies/scope/display/junit.js";
import { onConsole } from "./jiffies/scope/display/console.js";

import * as all from "./jiffies/test_all.js";

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
