import * as fs from "node:fs/promises";
import * as path from "node:path";
import { transpile } from "../../transpile.mjs";
import type { MiddlewareFactory } from "./index.ts";
import { contentResponse } from "./response.ts";

function render(source: string, headers: Map<string, string>) {
  // Replace `from "@scope` with `from "/@scope`, for browsers
  source = source
    .replaceAll(`from "@`, 'from "/@')
    .replaceAll(`import("@`, 'import("/@');
  return contentResponse(source, "application/javascript", 200, headers);
}

/**
 * Serves .js files statically. Finds .ts files and transpiles them to JS.
 */
export const tsFileServer: MiddlewareFactory =
  async ({ root, scopes = {} }) =>
  async (req) => {
    if (req.url?.endsWith(".js") || req.url?.endsWith(".ts")) {
      const scope = Object.entries(scopes).find(([s]) =>
        req.url?.startsWith(`/${s}`),
      );
      // Expand url with found scope
      const url = scope ? req.url.replace(scope[0], scope[1]) : req.url;
      let filename = path.join(root, url);
      const stat = await fs.stat(filename);
      if (stat.isFile()) {
        let js: string;
        const headers: Map<string, string> = new Map();
        if (filename.endsWith(".ts")) {
          js = await transpile(filename, () => fs.readFile(filename));
          headers.set("SourceMap", `${url}.map`);
          js += `\n//# sourceURL=${url}`;
        } else {
          if (url.endsWith(".ts.map")) {
            filename = filename.replace(/\.map$/, "");
          }
          js = (await fs.readFile(filename)).toString("utf-8");
        }
        return render(js, headers);
      }
    }
    return undefined;
  };
