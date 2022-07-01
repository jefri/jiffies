import * as path from "path";
import * as fs from "fs/promises";
import { fileResponse } from "./response"
import type { MiddlewareFactory } from "./index"

export const staticFileServer: MiddlewareFactory =
  async ({ root, scopes = {} }) =>
  async (req) => {
    const scope = Object.entries(scopes).find(([s]) =>
      req.url?.startsWith(`/${s}`)
    );
    const url = new URL(req.url ?? "", `http://localhost`);
    const pathname = scope
      ? url.pathname.replace(scope[0], scope[1])
      : url.pathname;
    const filename = path.join(root, pathname);
    // Expand url with found scope
    console.log(scope, req.url, filename);

    try {
      const stat = await fs.stat(filename);
      return stat.isDirectory() ? undefined : fileResponse(filename, stat);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  };
