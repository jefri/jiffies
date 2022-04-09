import { describe, it } from "../scope/describe.js";
import { expect } from "../scope/expect.js";
import { table, tbody, td, th, thead, tr, button } from "./html.ts";

describe(
	"html",
	() => {
		it(
			"creates HTML Elements",
			() => {
				let tableBody;
				const myTable = table(
					thead(tr(th("Col A"), th("Col B"))),
					(tableBody = tbody()),
				);
				for (let x = 1; x <= 3; x++) {
					tableBody.appendChild(tr(td(`${x}`), td(`${x * 2}`)));
				}
				expect(myTable.textContent).toEqual("Col ACol B122436");
			},
		);

		it(
			"attaches event handlers",
			() => {
				let clicked = false;
				const btn = button({
					events: {
						click: () => {
							clicked = true;
						},
					},
				});
				btn.click();
				expect(clicked).toBe(true);
			},
		);

		it(
			"removes event handlers",
			() => {
				let clicked = 0;
				const btn = button({
					events: {
						click: () => {
							clicked += 1;
						},
					},
				});
				btn.click();

				expect(clicked).toBe(1);

				btn.update({ events: { click: null } });
				btn.click();
				expect(clicked).toBe(1);
			},
		);

		it(
			"sets style strings",
			() => {
				const btn = button({ style: "flex-direction: column" });

				expect(btn.style.flexDirection).toBe("column");
			},
		);

		it(
			"sets style properties",
			() => {
				const btn = button({ style: { flexDirection: "column" } });

				expect(btn.style.flexDirection).toBe("column");
			},
		);

		it(
			"sets style, attributes, and events together",
			() => {
				let clicked = false;
				const btn = button({
					class: "test-class",
					style: { flexDirection: "column" },
					events: { click: () => (clicked = true) },
				});
				btn.click();

				expect(btn.classList.contains("test-class")).toBe(true);
				expect(btn.style.flexDirection).toBe("column");
				expect(clicked).toBe(true);
			},
		);
	},
);
