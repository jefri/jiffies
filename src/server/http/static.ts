import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { MiddlewareFactory } from "./index.ts";
import { fileResponse } from "./response.ts";

export const staticFileServer: MiddlewareFactory =
  async ({ root, scopes = {} }) =>
  async (req) => {
    const scope = Object.entries(scopes).find(([s]) =>
      req.url?.startsWith(`/${s}`),
    );
    const url = new URL(req.url ?? "", "http://localhost");
    const pathname = scope
      ? url.pathname.replace(scope[0], scope[1])
      : url.pathname;
    const filename = path.join(root, pathname);

    try {
      const stat = await fs.stat(filename);
      return stat.isDirectory() ? undefined : fileResponse(filename, stat);
    } catch (e) {
      if ((e as { code?: string }).code === "ENOENT") {
        return fileResponse(filename, undefined, 404);
      }
      console.error(e);
      return undefined;
    }
  };
