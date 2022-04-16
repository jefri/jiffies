import * as fs from "fs/promises";
import * as path from "path";
import { contentResponse } from "./response.js";
import { transpile } from "../../transpile.mjs";
import { MiddlewareFactory, StaticMiddleware } from "./index.js";

/**
 * Serves .js files statically. Finds .ts files and transpiles them to JS.
 */
export const tsFileServer: MiddlewareFactory =
  async ({ root, scopes = {} }) =>
  async (req) => {
    if (req.url?.endsWith(".js")) {
      let scope = Object.entries(scopes).find(([s, r]) =>
        req.url?.startsWith(s)
      );
      let url = scope ? req.url.replace(scope[0], scope[1]) : req.url;
      let filename = path.join(root, url);
      try {
        const stat = await fs.stat(filename);
        if (stat.isFile()) {
          const js = (await fs.readFile(filename)).toString("utf-8");
          return contentResponse(js, "application/javascript");
        }
      } catch {}

      filename = filename.replace(/\.js$/, ".ts");
      try {
        const stat = await fs.stat(filename);
        if (stat.isFile()) {
          const js = await transpile(filename, () => fs.readFile(filename));
          return contentResponse(js, "application/javascript");
        }
      } catch {}
    }
    return undefined;
  };
