import * as fs from "fs/promises";
import * as path from "path";
import { contentResponse } from "./response.js";
import { MiddlewareFactory } from "./index.js";
import sass from "sass";
const { compileStringAsync } = sass;

function render(source: string) {
  // Replace `from "@scope` with `from "/@scope`, for browsers
  // source = source
  //   .replaceAll(`from "@`, 'from "/@')
  //   .replaceAll(`import("@`, 'import("/@');
  return contentResponse(source, "text/css");
}

async function compile(
  filename: string,
  root: string,
  vars: string
): Promise<string> {
  vars = vars.substring(1).replaceAll("=", ":");
  filename = filename.replaceAll("\\", "/"); // Normalize for dart-sass
  const sassString = `// Using variables: ${vars}\n${vars};\n@import "${filename}";`;
  return (await compileStringAsync(sassString, { loadPaths: [root] })).css;
}

/**
 * Serves .css files statically. Finds .sass files and transpiles them to css.
 */
export const cssFileServer: MiddlewareFactory =
  async ({ root, scopes = {} }) =>
  async (req) => {
    const Url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (Url.pathname.endsWith(".css")) {
      let scope = Object.entries(scopes).find(([s]) =>
        Url.pathname.startsWith(`/${s}`)
      );
      // Expand url with found scope
      Url.protocol = "file";
      let url = scope ? Url.pathname.replace(scope[0], scope[1]) : Url.pathname;
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
          const css = await compile(
            filename.replace(root, "."),
            root,
            Url.search
          );
          return render(css);
        }
      } catch {}
    }
    return undefined;
  };
