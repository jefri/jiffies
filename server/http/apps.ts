import * as fs from "fs/promises";
import * as path from "path";
import { StaticMiddleware } from "./index.js";
import { fileResponse } from "./response.js";

/**
 * Searches up the request path until the first index is found.
 */
export const findIndex: StaticMiddleware = async (req) => {
  let filename = path.join(process.cwd(), req.url ?? "");
  if (path.basename(filename).match(/\.[a-z]{1,3}$/)) {
    return undefined;
  }
  while (filename.startsWith(process.cwd())) {
    const index = path.join(filename, "index.html");
    try {
      const stat = await fs.stat(index);
      return fileResponse(index, stat);
    } catch (e) {
      filename = path.dirname(filename);
    }
  }
  return undefined;
};
