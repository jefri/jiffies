import { h1, main } from "../../../../../src/dom/html.ts";

export default {
  default: () => main(h1("App")),
  clientModules: ["/client.ts"],
};
