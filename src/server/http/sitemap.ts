import * as fs from "fs/promises";
import * as path from "path";
import { info } from "../../jiffies/log.js";
import { StaticMiddleware } from "./index.js";
import { contentResponse } from "./response.js";

const findSiteMap = async (root: string) => {
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
          info(`Adding to sitemap`, { index: next });
          return [next];
        }
      } else if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) {
          return [];
        }
        const flattened = (await Promise.all(await findSiteMap(next))).flat();
        return flattened;
      }
      return [];
    }
  );
  return children;
};

const apps = await (
  await Promise.all(await findSiteMap(path.join(process.cwd(), "src")))
)
  .flat()
  .filter((a) => a !== undefined);

export const sitemap: StaticMiddleware = async (req) => {
  if ((req.url ?? "").endsWith("sitemap.json")) {
    return contentResponse(JSON.stringify(apps), "application/json");
  }
  return undefined;
};
