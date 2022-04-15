import { article, header } from "../../../dom/html.js";
import { execute } from "../../../scope/execute.js";
import { displayStatistics } from "../../../scope/display/dom.js";
import { onConsole } from "../../../scope/display/console.js";

import * as twos from "../util/twos.test.js";
import * as asm from "../util/asm.test.js";
import * as chip from "../simulator/chip/chip.test.js";
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
