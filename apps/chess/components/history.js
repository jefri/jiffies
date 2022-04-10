import { FC } from "../../../jiffies/dom/fc.js";
import { Err, Ok, isOk } from "../../../jiffies/result.js";
import { range } from "../../../jiffies/range.js";
import {
  button,
  input,
  span,
  table,
  tbody,
  td,
  tfoot,
  th,
  thead,
  tr,
} from "../../../jiffies/dom/html.js";
import { BLACK, ChessGame, Move, WHITE } from "../game/chess.js";

export const history = FC(
  "chess-history",
  (
    el,
    /** @type {{game: ChessGame, events?: {move?: (m: Move) => void, undo?: () => {}}}} */ {
      game,
      events,
    }
  ) => {
    const tryInput =
      (/** @type import("../game/chess.js").Color */ color) =>
      (
        /** @type Event */
        e
      ) => {
        notification.update("");
        const { value = "" } = /** @type HTMLInputElement */ (e?.target);
        const move = Move.parse(value, color, game);
        if (isOk(move)) {
          (events?.move ?? (() => {}))(Ok(move));
        } else {
          notification.update(`${Err(move).message}`);
        }
      };
    const whiteInput = input({
      name: "WhiteMove",
      disabled: game.toPlay === BLACK,
      events: { change: tryInput(WHITE) },
    });
    const blackInput = input({
      name: "BlackMove",
      disabled: game.toPlay === WHITE,
      events: { change: tryInput(BLACK) },
    });
    const body = tbody(
      ...range(0, game.history.length, 2).map((i) =>
        tr(
          td(game.history[i]?.toString() ?? ""),
          td(game.history[i + 1]?.toString() ?? "")
        )
      )
    );
    const notification = span();

    setTimeout(() => {
      (game.toPlay === WHITE ? whiteInput : blackInput).focus();
    });

    return table(
      thead(tr(th("White"), th("Black"))),
      body,
      tfoot(
        tr(td(whiteInput), td(blackInput)),
        tr(td({ colSpan: 2 }, notification)),
        tr(td(button({ events: { click: events?.undo } }, "Undo")), td())
      )
    );
  }
);
