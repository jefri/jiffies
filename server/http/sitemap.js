import * as fs from "fs/promises";
import path from "path";
import { contentResponse } from "./index.js";

const findSiteMap = async (root) => {
  if (root.startsWith("node_modules")) return [];
  console.log(`Looking in ${root}`);
  return (await fs.readdir(root, { withFileTypes: true })).map(
    async (entry) => {
      const next = path.join(root, entry.name);
      if (entry.isFile()) {
        if (entry.name === "index.html") {
          console.log(`Found ${next}`);
          return [next];
        }
      } else if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) {
          return [];
        }
        return (await Promise.all(await findSiteMap(next))).flat();
      }
      return [];
    }
  );
};

export const sitemap = await (async () => {
  const apps = await (await Promise.all(await findSiteMap(".")))
    .flat()
    .filter((a) => a !== undefined);
  /** @type import("./index.js").StaticMiddleware */
  return (req) => {
    if ((req.url ?? "").endsWith("sitemap.json")) {
      return contentResponse(JSON.stringify(apps), "application/json");
    }
    return undefined;
  };
})();
