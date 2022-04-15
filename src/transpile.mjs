// @ts-ignore
import ts from "typescript";

const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  inlineSourceMap: true,
  inlineSources: true,
};

const tsmap = new Map();

export async function transpile(
  /** @type string */ url,
  /** @type {() => Promise<{toString(): string}>} */ get
) {
  if (!tsmap.has(url) || true) {
    const source = ts.transpile(
      (await get()).toString(),
      compilerOptions,
      url,
      undefined,
      url
    );
    tsmap.set(url, source);
  }

  return tsmap.get(url);
}
