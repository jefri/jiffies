export const parse = (parseArgs: string[]) => {
  const fromNode = parseArgs[0].endsWith("node");
  const argv = parseArgs[fromNode ? 1 : 0];
  const params = new Map<string, string>();
  const flags = new Map<string, boolean>();
  const args: string[] = [];

  let index = fromNode ? 2 : 1;
  const hasNext = () => index < parseArgs.length;
  const peek = () => parseArgs[index];
  const advance = () => parseArgs[index++];

  const parseLong = (arg: string) => {
    if (arg.substr(0, 3) === "no-") {
      flags.set(arg.substr(3), false);
    } else if (!arg.includes("=")) {
      flags.set(arg, true);
    } else {
      const [param, ...value] = arg.split("=");
      params.set(param, value.join("="));
    }
  };

  while (hasNext()) {
    if (peek().substr(0, 2) === "--") {
      parseLong(advance().substr(2));
    } else {
      args.push(advance());
    }
  }

  return {
    get argv0() {
      return argv;
    },

    get args(): ReadonlyArray<string> {
      return args;
    },

    get(flag: string, def = false) {
      return flags.get(flag) ?? def;
    },

    asNumber(param: string, def = 0): number {
      return Number.parseFloat(params.get(param) ?? `${def}`);
    },

    asString(param: string, def = ""): string {
      return params.get(param) ?? def;
    },
  };
};
