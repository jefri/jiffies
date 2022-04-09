import { takeWhile } from "./generator.js";
import { describe, it, expect } from "./scope/index.js";

describe(
	"Generator Jiffies",
	() => {
		it(
			"takes from a generator until a predicate",
			() => {
				const generator = function* () {
					let i = 1;
					while (true) {
						yield (i = i * 2);
					}
				};
				const filter = () => {
					let previousValue = 0;
					return (n) => {
						if (previousValue < 100) {
							previousValue = n;
							return true;
						}
						return false;
					};
				};

				const values = [...takeWhile(filter(), generator())];
				expect(values).toEqual([2, 4, 8, 16, 32, 64, 128]);
			},
		);
	},
);
