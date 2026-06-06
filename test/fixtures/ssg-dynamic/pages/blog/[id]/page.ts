import { p } from "../../../../../../src/dom/html.ts";

export default {
  default: (params?: Record<string, string>) =>
    p(`Post: ${params?.id ?? "unknown"}`),
  generateStaticParams: async () => [{ id: "hello" }, { id: "world" }],
};
