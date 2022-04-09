import { stat } from "node:fs/promises";
import { cwd } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transpile } from "./transpile.mjs";

const baseURL = pathToFileURL(`${cwd()}/`).href;

export async function resolve(specifier, context, defaultResolve) {
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

export async function load(url, context, defaultLoad) {
  return url.endsWith("ts")
    ? {
        format: "module",
        source: await transpile(
          url,
          async () => (await defaultLoad(url, { format: "module" })).source
        ),
      }
    : defaultLoad(url, context, defaultLoad);
}
