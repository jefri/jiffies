export const parse = (/** @type string[] */ parseArgs) => {
  const fromNode = parseArgs[0].endsWith("node");
  const argv = parseArgs[fromNode ? 1 : 0];
  /** @type {Map<string, string>} */
  const params = new Map();
  /** @type {Map<string, boolean>} */
  const flags = new Map();
  /** @type {string[]} */
  const args = [];

  let index = fromNode ? 2 : 1;
  const hasNext = () => index < parseArgs.length;
  const peek = () => parseArgs[index];
  const advance = () => parseArgs[index++];

  while (hasNext()) {
    if (peek().substr(0, 2) == "--") {
      const arg = advance().substr(2);
      if (arg.substr(0, 3) === "no-") {
        flags.set(arg.substr(3), false);
      } else if (!arg.includes("=")) {
        flags.set(arg, true);
      } else {
        const [param, ...value] = arg.split("=");
        params.set(param, value.join("="));
      }
    } else {
      args.push(advance());
    }
  }

  return {
    get argv0() {
      return argv;
    },

    /** @returns {ReadonlyArray<string>} */
    get args() {
      return args;
    },

    get(/** @type {string} */ flag, def = false) {
      return flags.get(flag) ?? def;
    },

    /** @return number */
    asNumber(/** @type {string} */ param, def = 0) {
      return Number.parseFloat(params.get(param) ?? `${def}`);
    },

    /** @return string */
    asString(/** @type {string} */ param, def = "") {
      return params.get(param) ?? def;
    },
  };
};
