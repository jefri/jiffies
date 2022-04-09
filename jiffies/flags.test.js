import { describe, it, expect } from "./scope/index.js";
import { parse } from "./flags.js";

const TEST_CASES = {
	SIMPLE: "program",
	NODE: "/usr/local/bin/node program",
	ONE_FLAG: "program --fun",
	ONE_PARAM: "program --fun=100",
	ONE_ARG: "program cat",
	ONE_NO_FLAG: "program --no-fun",
	MIXED: "program --fun=dog cat --port=8080 mouse --hamster --no-bird",
};

const makeFlags = (commandLine) => {
	return parse(commandLine.split(" "));
};

describe(
	"flags",
	() => {
		it(
			"stores the program name",
			() => {
				const flags = makeFlags(TEST_CASES.SIMPLE);

				expect(flags.argv0).toEqual("program");
				expect(flags.args).toEqual([]);
			},
		);

		it(
			"stores the program name ignoring node",
			() => {
				const flags = makeFlags(TEST_CASES.NODE);

				expect(flags.argv0).toEqual("program");
				expect(flags.args).toEqual([]);
			},
		);

		it(
			"parses a flag",
			() => {
				const flags = makeFlags(TEST_CASES.ONE_FLAG);
				expect(flags.get("fun")).toBe(true);
			},
		);

		it(
			"parses a flag with a default value",
			() => {
				const flags = makeFlags(TEST_CASES.SIMPLE);
				expect(flags.get("missing")).toBe(false);
				expect(flags.get("missing", true)).toBe(true);
			},
		);
	},
);
