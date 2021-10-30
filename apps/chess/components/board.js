import { FC } from "../../../jiffies/dom/fc.js";
import { span, table, td, tr } from "../../../jiffies/dom/html.js";
import { ChessGame, index, Piece } from "../game/chess.js";

/** @type [8, 7, 6, 5, 4, 3, 2, 1] */
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
/** @type ['a','b','c','d','e','f','g','h'] */
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const parity = (
  /** @type {'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'} */ file,
  /** @type number */ rank
) => (file.charCodeAt(0) - 97 + rank) % 2 == 0;

export const ChessBoard = FC(
  "chess-board",
  (el, /** @type {{game: ChessGame}} */ { game }) =>
    table(
      {
        style: {
          width: "inherit",
          color: "black",
          fontSize: "2em",
          fontFamily: "sans-serif",
        },
      },
      ...RANKS.map((rank) =>
        tr(
          ...FILES.map((file) =>
            td(
              {
                square: `${file}${rank}`,
                style: {
                  position: "relative",
                  width: "2em",
                  height: "2em",
                  color: "black",
                  textAlign: "center",
                  backgroundColor: parity(file, rank) ? "white" : "lightgray",
                  border: "none",
                },
              },
              span(
                {
                  style: {
                    display: "block",
                    position: "absolute",
                    bottom: "0",
                    left: "0",
                    fontSize: "0.5em",
                    opacity: "0.2",
                  },
                },
                `${file}${rank}`
              ),
              span(
                {
                  style: {
                    display: "block",
                    position: "absolute",
                    bottom: "0",
                    right: "0",
                    fontSize: "0.5em",
                    opacity: "0.2",
                  },
                },
                `${index(file, rank)}`
              ),
              Piece(game.at(file, rank))[2]
            )
          )
        )
      )
    )
);
