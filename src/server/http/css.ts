import * as fs from "fs/promises";
import * as path from "path";
import { contentResponse } from "./response.js";
import { MiddlewareFactory } from "./index.js";
import sass from "sass";
const { compileAsync } = sass;

function render(source: string) {
  // Replace `from "@scope` with `from "/@scope`, for browsers
  // source = source
  //   .replaceAll(`from "@`, 'from "/@')
  //   .replaceAll(`import("@`, 'import("/@');
  return contentResponse(source, "text/css");
}

/**
 * Serves .css files statically. Finds .sass files and transpiles them to css.
 */
export const cssFileServer: MiddlewareFactory =
  async ({ root, scopes = {} }) =>
  async (req) => {
    if (req.url?.endsWith(".css")) {
      let scope = Object.entries(scopes).find(([s]) =>
        req.url?.startsWith(`/${s}`)
      );
      // Expand url with found scope
      let url = scope ? req.url.replace(scope[0], scope[1]) : req.url;
      let filename = path.join(root, url);
      try {
        const stat = await fs.stat(filename);
        if (stat.isFile()) {
          const css = (await fs.readFile(filename)).toString("utf-8");
          return render(css);
        }
      } catch {}

      filename = filename.replace(/\.css$/, ".scss");
      try {
        const stat = await fs.stat(filename);
        if (stat.isFile()) {
          const { css } = await compileAsync(filename);
          return render(css);
        }
      } catch {}
    }
    return undefined;
  };
