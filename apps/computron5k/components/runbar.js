import { Select } from "../../../jiffies/components/select.js";
import { FC } from "../../../jiffies/dom/fc.ts";
import { button, li, nav, ul } from "../../../jiffies/dom/html.ts";
import { Timer } from "../simulator/timer.js";

/** @typedef {import("../../../jiffies/dom/dom.js").DenormChildren} DenormChildren */

const runButton = {
  fontSize: "2rem",
  margin: "0",
  padding: "0",
  lineHeight: "2rem",
  background: "none",
  border: "none",
};

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
        li(
          button(
            {
              style: { ...runButton },
              events: { click: () => runner.frame() },
            },
            "➡️"
          )
        ),
        li(
          button(
            {
              style: { ...runButton },
              events: { click: () => runner.reset() },
            },
            "⏪"
          )
        ),
        li(
          button(
            {
              style: { ...runButton },
              events: {
                click: () => (runner.running ? runner.stop() : runner.start()),
              },
            },
            runner.running ? "⏸" : "▶️"
          )
        ),
        li(
          Select({
            name: "speed",
            events: {
              change: (e) =>
                (runner.speed = Number(e.target?.value ?? runner.speed)),
            },
            disabled: runner.running,
            value: `${runner.speed}`,
            options: [
              ["16", "60FPS"],
              ["500", "Fast"],
              ["1000", "Normal"],
              ["2000", "Slow"],
            ],
          })
        ),
        li(
          Select({
            name: "steps",
            events: {
              change: (e) =>
                (runner.steps = Number(e.target?.value ?? runner.steps)),
            },
            disabled: runner.running,
            value: `${runner.steps}`,
            options: [
              ["1", "1 Step"],
              ["500", "500"],
              ["1000", "1000"],
              ["2000", "2000"],
            ],
          })
        )
      ),
      ...children
    )
);
