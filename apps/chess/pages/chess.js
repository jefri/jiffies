import { FC } from "../../../jiffies/dom/fc.js";
import { article, details, div, summary } from "../../../jiffies/dom/html.js";
import { ChessBoard } from "../components/board.js";
import { Board } from "../game/chess.js";
import { Test } from "./test.js";

export const Chess = FC("chess-game", () => {
  const board = new Board();
  /** @type import("../../../jiffies/dom/fc.js").Updateable */
  let test;
  const layout = div(
    { class: "grid" },
    article(details({ open: true }, summary("Board"), ChessBoard({ board }))),
    article(details({ open: true }, summary("Tests"), (test = div())))
  );

  requestAnimationFrame(() => test.update(Test()));

  return layout;
});
