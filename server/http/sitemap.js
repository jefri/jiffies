import * as fs from "fs/promises";
import path from "path";

const findSiteMap = async (root) => {
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
      return Promise.resolve([200, "sitemap.json", apps]);
    }
    return Promise.resolve([404]);
  };
})();
