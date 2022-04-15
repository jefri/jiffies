import { FC } from "../../../jiffies/dom/fc.js";
import { table, tbody, td, th, thead, tr } from "../../../jiffies/dom/html.js";
import { Pin, Pins } from "../simulator/chip/chip.js";
import { cursor } from "../../../jiffies/dom/css/cursor.js";

export const Pinout = FC(
  "pin-out",
  (el, { pins, toggle }: { pins: Pins; toggle?: (pin: Pin) => void }) =>
    table(
      thead(tr(th("Name"), th("Voltage"))),
      tbody(
        ...[...pins.entries()].map((pin) =>
          tr(
            td(pin.name),
            td(
              {
                style: { ...(toggle ? cursor("pointer") : {}) },
                events: {
                  ...(toggle ? { click: () => toggle(pin) } : {}),
                },
              },
              pin.voltage() == 0 ? "Low" : "High"
            )
          )
        )
      )
    )
);
