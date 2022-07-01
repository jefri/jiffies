import * as fs from "fs/promises";
import * as path from "path";
import { MiddlewareFactory } from "./index"
import { fileResponse } from "./response"

/**
 * Searches up the request path until the first index is found.
 */
export const findIndex: MiddlewareFactory =
  async ({ root }) =>
  async (req) => {
    let filename = path.join(root, req.url ?? "");
    if (path.basename(filename).match(/\.[a-z]{1,3}$/)) {
      return undefined;
    }
    while (filename.startsWith(root)) {
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
