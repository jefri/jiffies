import { join, relative } from "node:path";
import nodeResolve from "@rollup/plugin-node-resolve";
import { rollup } from "rollup";
import tsBlankSpace from "ts-blank-space";
import type { PageDescriptor } from "./ssg.ts";

/**
 * Bundle all distinct clientModules specifiers from `pages` using Rollup.
 *
 * Specifier resolution: a leading "/" is treated as relative to `rootDir`
 * (not the filesystem root), so "/client.ts" resolves to "<rootDir>/client.ts".
 * Relative specifiers resolve from `rootDir`. Absolute non-root paths are used
 * as-is.
 *
 * Returns a map from original specifier string to the hashed asset URL
 * ("/assets/<entry-name>-<hash>.js") so the HTML rewrite step can substitute
 * in place.
 */
export async function bundleClientModules(
  pages: PageDescriptor[],
  rootDir: string,
  outDir: string,
): Promise<Map<string, string>> {
  const allSpecs = new Set<string>();
  for (const { module } of pages) {
    for (const spec of module.clientModules ?? []) {
      allSpecs.add(spec);
    }
  }

  if (allSpecs.size === 0) return new Map();

  // Resolve each specifier to an absolute disk path under rootDir.
  // A leading "/" means "relative to rootDir", not the filesystem root.
  const specToPath = new Map<string, string>();
  for (const spec of allSpecs) {
    specToPath.set(spec, join(rootDir, spec));
  }

  // Build slug -> spec mapping and Rollup input record.
  const slugToSpec = new Map<string, string>();
  const input: Record<string, string> = {};
  for (const [spec, diskPath] of specToPath) {
    const rel = relative(rootDir, diskPath);
    const slug = rel.replace(/\//g, "-").replace(/\.[^.]+$/, "");
    slugToSpec.set(slug, spec);
    input[slug] = diskPath;
  }

  const bundle = await rollup({
    input,
    plugins: [
      {
        name: "ts-strip",
        transform(code, id) {
          if (id.endsWith(".ts")) {
            return { code: tsBlankSpace(code), map: null };
          }
          return null;
        },
      },
      nodeResolve({ extensions: [".ts", ".js"] }),
    ],
  });

  const assetsDir = join(outDir, "assets");
  const { output } = await bundle.write({
    dir: assetsDir,
    format: "es",
    entryFileNames: "[name]-[hash].js",
    chunkFileNames: "[name]-[hash].js",
  });

  const specToUrl = new Map<string, string>();
  for (const chunk of output) {
    if (chunk.type === "chunk" && chunk.isEntry) {
      const spec = slugToSpec.get(chunk.name);
      if (spec !== undefined) {
        specToUrl.set(spec, `/assets/${chunk.fileName}`);
      }
    }
  }

  return specToUrl;
}
