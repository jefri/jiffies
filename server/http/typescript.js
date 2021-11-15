import ts from "typescript";

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
