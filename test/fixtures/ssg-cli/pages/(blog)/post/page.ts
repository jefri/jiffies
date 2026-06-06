import { article, h1, p } from "../../../../../../src/dom/html.ts";

export default {
  default: () => article(h1("Post"), p("A blog post.")),
};
