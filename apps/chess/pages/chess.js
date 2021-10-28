import { FC } from "../../../jiffies/dom/fc.js";
import { article } from "../../../jiffies/dom/html.js";
import { ChessBoard } from "../components/board.js";
import { Board } from "../game/chess.js";

export const Chess = FC("chess-game", () => {
  const board = new Board();
  return article(ChessBoard({ board }));
});
