import { describe, it, expect } from "./scope/index.js";
import { lock } from "./lock.js";

describe(
	"Lock",
	function () {
		it(
			"prevents reentry",
			function () {
				let count = 0;
				const inc = lock(function () {
					if (count > 4) {
						return;
					}
					inc();
					count++;
				});
				inc();
				expect(count).toBe(1);
			},
		);
	},
);
