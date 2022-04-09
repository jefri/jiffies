import { article, header } from "../../../jiffies/dom/html.ts";
import { execute } from "../../../jiffies/scope/execute.js";
import { displayStatistics } from "../../../jiffies/scope/display/dom.js";
import { onConsole } from "../../../jiffies/scope/display/console.js";

import * as twos from "../util/twos.test.js";
import * as asm from "../util/asm.test.js";
import * as chip from "../simulator/chip/chip.test";
import * as alu from "../simulator/cpu/alu.test.js";
import * as cpu from "../simulator/cpu/cpu.test.js";

export const Test = () => {
  const root = article(header("Tests"));
  (async function test() {
    const results = await execute();
    displayStatistics(results, root);
    onConsole(results);
  })();
  return root;
};
