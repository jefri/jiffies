import { FC } from "../../../jiffies/dom/fc";
import { table, tbody, td, th, thead, tr } from "../../../jiffies/dom/html";
import { Pin, Pins } from "../simulator/chip/chip";
import { cursor } from "../../../jiffies/dom/css/cursor";

export const Pinout = FC(
	"pin-out",
	(el, { pins, toggle }: { pins: Pins, toggle?: (pin: Pin) => void }) =>
		table(
			thead(tr(th("Name"), th("Voltage"))),
			tbody(
				...[...pins.entries()].map(
					(pin) =>
						tr(
							td(pin.name),
							td(
								{
									style: { ...(toggle ? cursor("pointer") : {}) },
									events: { ...(toggle ? { click: () => toggle(pin) } : {}) },
								},
								pin.voltage() == 0 ? "Low" : "High",
							),
						),
				),
			),
		),
);
