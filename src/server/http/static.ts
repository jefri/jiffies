import * as path from "path";
import * as fs from "fs/promises";
import { fileResponse } from "./response.js";
import type { MiddlewareFactory, StaticMiddleware } from "./index.js";

export const staticFileServer: MiddlewareFactory =
  async ({ root }) =>
  async (req) => {
    const url = new URL(req.url ?? "", `http://localhost`);
    const filename = path.join(root, url.pathname);
    try {
      const stat = await fs.stat(filename);
      return stat.isDirectory() ? undefined : fileResponse(filename, stat);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  };
