import { Select } from "../../../jiffies/components/select.js";
import { DenormChildren } from "../../../jiffies/dom/dom.js";
import { FC } from "../../../jiffies/dom/fc";
import { button, li, nav, ul } from "../../../jiffies/dom/html";
import { Timer } from "../simulator/timer.js";

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
	(el, { runner }: { runner: Timer }, children: DenormChildren[]) =>
		nav(
			ul(
				li(
					button(
						{ style: { ...runButton }, events: { click: () => runner.frame() } },
						"⏭", // U+23ED
					),
				),
				li(
					button(
						{ style: { ...runButton }, events: { click: () => runner.reset() } },
						"⏪", // U+23EA
					),
				),
				li(
					button(
						{
							style: { ...runButton },
							events: {
								click: () => (runner.running ? runner.stop() : runner.start()),
							},
						},
						runner.running ? "⏸" : "⏵", // U+23F8 or U+23F5
					),
				),
			),
			ul(
				li(
					Select({
						name: "speed",
						events: {
							change: (e: InputEvent) => (
								runner.speed =
									Number((e.target as HTMLSelectElement)?.value ?? runner.speed)
							),
						},
						disabled: runner.running,
						value: `${runner.speed}`,
						options: [
							["16", "60FPS"],
							["500", "Fast"],
							["1000", "Normal"],
							["2000", "Slow"],
						],
					}),
				),
				li(
					Select({
						name: "steps",
						events: {
							change: (e: InputEvent) => (
								runner.steps =
									Number((e.target as HTMLSelectElement)?.value ?? runner.steps)
							),
						},
						disabled: runner.running,
						value: `${runner.steps}`,
						options: [
							["1", "1 Step"],
							["500", "500"],
							["1000", "1000"],
							["2000", "2000"],
						],
					}),
				),
			),
			...children,
		),
);
