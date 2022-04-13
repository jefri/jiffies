import * as fs from "fs/promises";
import * as path from "path";
import { contentResponse } from "./response.js";
import { transpile } from "../../transpile.mjs";

/**
 * Finds .ts files and transpiles them to JS.
 * @type import("./index.js").StaticMiddleware
 */
export const tsFileServer = async (req) => {
  if (req.url?.endsWith(".js")) {
    let filename = path.join(process.cwd(), req.url);
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
