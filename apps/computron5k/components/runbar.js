import { FC } from "../../../jiffies/dom/fc.js";
import {
  button,
  li,
  nav,
  option,
  select,
  ul,
} from "../../../jiffies/dom/html.js";
import { Timer } from "../simulator/timer.js";

/** @typedef {import("../../../jiffies/dom/dom.js").DenormChildren} DenormChildren */

export const Runbar = FC(
  "run-bar",
  /**
   * @param {HTMLElement} el
   * @param {{ runner: Timer; }} param1
   * @param {DenormChildren[]} children
   * @returns
   */
  (el, { runner }, children) =>
    nav(
      ul(
        li(button({ events: { click: runner.tick } }, "➡️")),
        li(button({ events: { click: runner.reset } }, "⏪")),
        li(
          button(
            {
              events: {
                click: () => (runner.running ? runner.stop() : runner.start()),
              },
            },
            runner.running ? "⏸" : "\u25B6️"
          )
        ),
        li(
          select(
            {
              name: "speed",
              events: {
                change: (e) =>
                  (runner.speed = Number(e.target?.value ?? runner.speed)),
              },
              disabled: runner.running,
            },
            ...[
              ["16", "60FPS"],
              ["500", "Fast"],
              ["1000", "Normal"],
              ["2000", "Slow"],
            ].map(([value, name]) =>
              option(
                {
                  value,
                  selected: `${runner.speed}` === value,
                },
                `${name}`
              )
            )
          )
        )
      ),
      ...children
    )
);
