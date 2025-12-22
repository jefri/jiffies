import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { MiddlewareFactory } from "./index.ts";
import { contentResponse } from "./response.ts";

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
    const Url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (Url.pathname.endsWith(".css")) {
      const scope = Object.entries(scopes).find(([s]) =>
        Url.pathname.startsWith(`/${s}`),
      );
      // Expand url with found scope
      Url.protocol = "file";
      const url = scope
        ? Url.pathname.replace(scope[0], scope[1])
        : Url.pathname;
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
          const css = (await fs.readFile(filename)).toString();
          return render(css);
        }
      } catch {}
    }
    return undefined;
  };
