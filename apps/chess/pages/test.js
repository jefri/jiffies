import { article, header } from "../../../jiffies/dom/html.js";
import { execute } from "../../../jiffies/scope/execute.js";
import { displayStatistics } from "../../../jiffies/scope/display/dom.ts";
import { onConsole } from "../../../jiffies/scope/display/console.js";

import * as chess from "../game/chess.test.js";

export const Test = () => {
  const root = article(header("Tests"));
  (async function test() {
    const results = await execute();
    displayStatistics(results, root);
    onConsole(results);
  })();
  return root;
};
