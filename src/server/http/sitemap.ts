import * as fs from "fs/promises";
import * as path from "path";
import { info } from "../../log.js";
import { MiddlewareFactory } from "./index.js";
import { contentResponse } from "./response.js";

const findSiteMap = async (root: string, prefix = root) => {
  if (root.startsWith("node_modules")) {
    return [];
  }
  const children = (await fs.readdir(root, { withFileTypes: true })).map(
    async (entry): Promise<string[]> => {
      const next = path
        .join(root, entry.name)
        // Normalize separators for web
        .replaceAll(path.sep, "/");
      if (entry.isFile()) {
        if (entry.name === "index.html") {
          let index = next.replace(prefix, "");
          info(`Adding to sitemap`, { index });
          return [index];
        }
      } else if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) {
          return [];
        }
        const flattened = (
          await Promise.all(await findSiteMap(next, prefix))
        ).flat();
        return flattened;
      }
      return [];
    }
  );
  return children;
};

export const sitemap: MiddlewareFactory = async ({ root }) => {
  const apps = await (await Promise.all(await findSiteMap(root)))
    .flat()
    .filter((a) => a !== undefined);
  return async (req) => {
    if ((req.url ?? "").endsWith("sitemap.json")) {
      return contentResponse(JSON.stringify(apps), "application/json");
    }
    return undefined;
  };
};
