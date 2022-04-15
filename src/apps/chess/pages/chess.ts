import { FC } from "../../../dom/fc.js";
import { article, details, div, summary } from "../../../dom/html.js";
import { ChessBoard } from "../components/board.js";
import { history } from "../components/history.js";
import { ChessGame, Move } from "../game/chess.js";
import { Test } from "./test.js";

export const Chess = FC("chess-game", () => {
  let game = new ChessGame();
  const board = ChessBoard({ game });
  const move = (m: Move) => {
    game = game.do(m);
    update();
  };
  const undo = () => {
    if (game.previous !== null) {
      game = game.previous;
      update();
    }
  };
  const update = () => {
    board.update({ game });
    input.update({ game });
  };
  const input = history({ game, events: { move, undo } });
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
