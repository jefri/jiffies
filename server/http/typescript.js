import ts from "typescript";
import * as fs from "fs/promises";
import * as path from "path";
import { contentResponse } from "./response.js";

/** @type {import("typescript").CompilerOptions} */
const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  inlineSourceMap: true,
  inlineSources: true,
};

export function compile(
  /** @type {string} */ filename,
  /** @type {string} */ source
) {
  return ts.transpile(source, compilerOptions, filename, undefined, filename);
}

/**
 * Finds .ts files and transpiles them to JS.
 * @type import("./index.js").StaticMiddleware
 */
export const tsFileServer = async (req) => {
  const url = req.url?.endsWith(".ts") ? req.url : `${req.url}.ts`;
  const filename = path.join(process.cwd(), url);
  try {
    const stat = await fs.stat(filename);
    if (stat.isFile()) {
      const source = (await fs.readFile(filename)).toString("utf-8");
      const js = compile(filename, source);
      return contentResponse(js, "application/javascript");
    }
  } catch {}
  return undefined;
};
