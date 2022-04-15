import * as path from "path";
import * as fs from "fs/promises";
import { fileResponse } from "./response.js";
import type { StaticMiddleware } from "./index.js";

export const staticFileServer: StaticMiddleware = async (req) => {
  const url = new URL(req.url ?? "", `http://localhost`);
  const filename = path.join(process.cwd(), "src", url.pathname);
  try {
    const stat = await fs.stat(filename);
    return stat.isDirectory() ? undefined : fileResponse(filename, stat);
  } catch (e) {
    console.error(e);
    return undefined;
  }
};
