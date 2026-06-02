import * as fs from "node:fs/promises";
import * as path from "node:path";
import { info } from "../../log.ts";
import type { MiddlewareFactory } from "./index.ts";
import { contentResponse } from "./response.ts";

export const sitemap: MiddlewareFactory = async ({ root }) => {
  const apps: string[] = [];
  for await (const file of fs.glob("**/index.html", {
    cwd: root,
    withFileTypes: false,
    exclude: (name) => name === "node_modules",
  })) {
    const index = `/${file.replaceAll(path.sep, "/")}`;
    info("Adding to sitemap", { index });
    apps.push(index);
  }
  return async (req) => {
    if ((req.url ?? "").endsWith("sitemap.json")) {
      return contentResponse(JSON.stringify(apps), "application/json");
    }
    return undefined;
  };
};
