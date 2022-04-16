import * as fs from "fs/promises";
import * as path from "path";
import { contentResponse } from "./response.js";
import { transpile } from "../../transpile.mjs";
import { MiddlewareFactory } from "./index.js";

function render(source: string) {
  // Replace `from "@scope` with `from "/@scope`, for browsers
  source = source
    .replaceAll(`from "@`, 'from "/@')
    .replaceAll(`import("@`, 'import("/@');
  return contentResponse(source, "application/javascript");
}

/**
 * Serves .js files statically. Finds .ts files and transpiles them to JS.
 */
export const tsFileServer: MiddlewareFactory =
  async ({ root, scopes = {} }) =>
  async (req) => {
    if (req.url?.endsWith(".js")) {
      let scope = Object.entries(scopes).find(([s]) =>
        req.url?.startsWith(`/${s}`)
      );
      // Expand url with found scope
      let url = scope ? req.url.replace(scope[0], scope[1]) : req.url;
      let filename = path.join(root, url);
      try {
        const stat = await fs.stat(filename);
        if (stat.isFile()) {
          const js = (await fs.readFile(filename)).toString("utf-8");
          return render(js);
        }
      } catch {}

      filename = filename.replace(/\.js$/, ".ts");
      try {
        const stat = await fs.stat(filename);
        if (stat.isFile()) {
          const js = await transpile(filename, () => fs.readFile(filename));
          return render(js);
        }
      } catch {}
    }
    return undefined;
  };
