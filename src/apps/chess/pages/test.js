import { article, header } from "../../../dom/html.js";
import { execute } from "../../../scope/execute.js";
import { displayStatistics } from "../../../scope/display/dom.js";
import { onConsole } from "../../../scope/display/console.js";

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
