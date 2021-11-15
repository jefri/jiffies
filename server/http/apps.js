import * as path from "path";
import { fileResponse } from "./response.js";

/**
 * Searches up the request path until the first index is found.
 *
 * @type import("./index.js").StaticMiddleware
 */
export const findIndex = async (req) => {
  let filename = path.join(process.cwd(), req.url ?? "");
  let basename = path.basename(filename);
  if (basename.match(/\.[a-z]{2,3}$/)) {
    return undefined;
  }
  while (filename.startsWith(process.cwd())) {
    const index = path.join(filename, "index.html");
    try {
      return fileResponse(index);
    } catch {
      filename = path.dirname(filename);
    }
  }
  return undefined;
};
