import { FC } from "../../../jiffies/dom/fc.js";
import { article, details, div, summary } from "../../../jiffies/dom/html.js";
import { ChessBoard } from "../components/board.js";
import { history } from "../components/history.js";
import { ChessGame, Move } from "../game/chess.js";
import { Test } from "./test.js";

export const Chess = FC("chess-game", () => {
  const game = new ChessGame();
  const board = ChessBoard({ game });
  const move = (/** @type Move */ m) => {
    game.do(m);
    board.update({ game });
    input.update({ game });
  };
  const input = history({ game, events: { move } });
  const test = div();

  const layout = div(
    { class: "grid" },
    article(details({ open: true }, summary("Board"), board)),
    article(
      details({ open: true }, summary("History"), input),
      details({ open: true }, summary("Tests"), test)
    )
  );

  requestAnimationFrame(() => test.update(Test()));

  return layout;
});
