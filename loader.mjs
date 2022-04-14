import { stat } from "node:fs/promises";
import { cwd } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transpile } from "./transpile.mjs";

const baseURL = pathToFileURL(`${cwd()}/`).href;

/** @returns {Promise<{url: string}>} */
export async function resolve(
  /** @type string */ specifier,
  /** @type {{parentURL?: string}} */ context,
  /** @type {(specifier: string, context: {parentURL?: string}, defaultResolve: Function) => Promise<{url: string}>} */ defaultResolve
) {
  const tsURL = new URL(
    specifier.replace(/js$/, "ts"),
    context.parentURL ?? baseURL
  );
  const tsSpecifier = tsURL.href;
  try {
    const stats = await stat(fileURLToPath(tsURL));
    if (stats.isFile()) {
      return { url: tsSpecifier };
    }
  } catch (e) {
    // Do nothing
  }
  return defaultResolve(specifier, context, defaultResolve);
}

/** @returns {Promise<{source: string}>} */
export async function load(
  /** @type string */ url,
  /** @type {{format?: string}} */ context,
  /** @type {(url: string, context: {format?: string}, defaultLoad?: Function) => Promise<{source: string}>} */ defaultLoad
) {
  return url.endsWith("ts")
    ? {
        source: await transpile(
          url,
          async () => (await defaultLoad(url, { format: "module" })).source
        ),
      }
    : defaultLoad(url, context, defaultLoad);
}
