import { article, div, header } from "../../../jiffies/dom/html.js";
import { displayStatistics, execute } from "../../../jiffies/scope/execute.js";

import * as twos from "../util/twos.test.js";
import * as asm from "../util/asm.test.js";
import * as alu from "../simulator/chips/alu.test.js";
import * as cpu from "../simulator/chips/cpu.test.js";

export const Test = () => {
  const root = article(header("Tests"));
  (async function test() {
    const errors = await execute();
    displayStatistics(errors, root);
  })();
  return root;
};
