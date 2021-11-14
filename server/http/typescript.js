import ts from "typescript";

/** @type {import("typescript").CompilerOptions} */
const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
};

export function compile(/** @type {string} */ source) {
  return ts.transpile(source, compilerOptions);
}
