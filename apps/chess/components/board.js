import { FC } from "../../../jiffies/dom/fc.js";
import { table, td, tr } from "../../../jiffies/dom/html.js";
import { Board, Piece } from "../game/chess.js";

const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
/** @type ['a','b','c','d','e','f','g','h'] */
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const parity = (
  /** @type {'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'} */ file,
  /** @type number */ rank
) => (file.charCodeAt(0) - 97 + rank) % 2 == 0;

export const ChessBoard = FC(
  "chess-board",
  (el, /** @type {{board: Board}} */ { board }) =>
    table(
      {
        style: {
          width: "inherit",
          color: "black",
          fontSize: "2em",
        },
      },
      ...RANKS.map((rank) =>
        tr(
          ...FILES.map((file) =>
            td(
              {
                style: {
                  width: "2em",
                  height: "2em",
                  color: "black",
                  textAlign: "center",
                  backgroundColor: parity(file, rank) ? "white" : "lightgray",
                },
              },
              Piece(board.at(file, rank))[2]
            )
          )
        )
      )
    )
);
