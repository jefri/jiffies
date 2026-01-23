import tsBlankSpace from "ts-blank-space";

const tsmap = new Map();

export async function transpile(
  /** @type string */ url,
  /** @type {() => Promise<{toString(): string}>} */ get,
) {
  if (!tsmap.has(url)) {
    const source = (await get()).toString();
    const js = tsBlankSpace(source);
    tsmap.set(url, js);
  }

  return tsmap.get(url);
}
