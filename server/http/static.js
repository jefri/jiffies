import * as path from "path";
import * as fs from "fs/promises";
import { fileResponse } from "./response.js";

/**
 * If path matches a file exactly, serve it. Valid mime types are .html, .js, .css, and images.
 * @type import("./index.js").StaticMiddleware
 */
export const staticFileServer = async (req) => {
  const filename = path.join(process.cwd(), req.url ?? "");
  try {
    const stat = await fs.stat(filename);
    return stat.isDirectory() ? undefined : fileResponse(filename, stat);
  } catch (e) {
    console.error(e);
    return undefined;
  }
};
