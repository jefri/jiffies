#!/usr/bin/env node
// CLI entry point for `ssg build`. All diagnostics go to stderr.
// stdout is reserved exclusively for --json output.

import * as process from "node:process";
import { parseArgs } from "node:util";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { NodeFileSystem } from "../fs_node.ts";
import { build } from "./ssg.ts";
import { bundleClientModules } from "./bundle.ts";
import { copyPublic } from "./copy-public.ts";
import { discoverPages } from "./discover.ts";
import { rewriteClientSpecifiers } from "./rewrite.ts";

interface CliValues {
  help: boolean | undefined;
  version: boolean | undefined;
  root: string;
  out: string;
  pages: string;
  public: string;
  json: boolean;
  "no-clean": boolean;
}

interface AssetEntry {
  path: string;
  rawBytes: number;
  gzipBytes: number;
}

interface BuildManifest {
  pages: AssetEntry[];
  assets: AssetEntry[];
  public: AssetEntry[];
  durationMs: number;
}

function htmlPathForRoute(route: string, outDir: string): string {
  const segment = route.replace(/^\//, "");
  return segment ? `${outDir}/${segment}/index.html` : `${outDir}/index.html`;
}

async function sizeEntry(absPath: string, outDir: string): Promise<AssetEntry> {
  const content = await readFile(absPath);
  return {
    path: relative(outDir, absPath),
    rawBytes: content.byteLength,
    gzipBytes: gzipSync(content).byteLength,
  };
}

function fmtBytes(n: number): string {
  return n >= 1024 ? `${(n / 1024).toFixed(1)} kB` : `${n} B`;
}

async function runBuild(values: CliValues): Promise<void> {
  const start = Date.now();
  const rootDir = resolve(values.root);
  const outDir = resolve(values.out);

  let pages: Awaited<ReturnType<typeof discoverPages>>;
  try {
    pages = await discoverPages(rootDir, values.pages);
  } catch (e) {
    process.stderr.write(`Error: ${(e as Error).message}\n`);
    process.exit(1);
  }

  const fs = new NodeFileSystem();
  await build({ pages, out: outDir, fs });
  const publicPaths = await copyPublic(rootDir, values.public, outDir);

  const specToUrl = await bundleClientModules(pages, rootDir, outDir);
  if (specToUrl.size > 0) {
    for (const { route, module } of pages) {
      if (!module.clientModules?.length) continue;
      const htmlPath = htmlPathForRoute(route, outDir);
      const original = await readFile(htmlPath, "utf-8");
      await writeFile(
        htmlPath,
        rewriteClientSpecifiers(original, specToUrl),
        "utf-8",
      );
    }
  }

  // Collect sizes.
  const htmlPaths = pages.map(({ route }) => htmlPathForRoute(route, outDir));

  const assetsDir = join(outDir, "assets");
  let assetFiles: string[] = [];
  try {
    assetFiles = (await readdir(assetsDir)).map((f) => join(assetsDir, f));
  } catch {
    // no assets directory when no clientModules
  }

  const [pageEntries, assetEntries, publicEntries] = await Promise.all([
    Promise.all(htmlPaths.map((p) => sizeEntry(p, outDir))),
    Promise.all(assetFiles.map((p) => sizeEntry(p, outDir))),
    Promise.all(publicPaths.map((p) => sizeEntry(p, outDir))),
  ]);

  const manifest: BuildManifest = {
    pages: pageEntries,
    assets: assetEntries,
    public: publicEntries,
    durationMs: Date.now() - start,
  };

  if (values.json) {
    process.stdout.write(JSON.stringify(manifest, null, 2));
  } else {
    const all = [...pageEntries, ...assetEntries, ...publicEntries];
    const maxPath = Math.max(...all.map((e) => e.path.length));
    for (const entry of all) {
      const padded = entry.path.padEnd(maxPath);
      process.stderr.write(
        `${padded}  ${fmtBytes(entry.rawBytes)} │ gzip: ${fmtBytes(entry.gzipBytes)}\n`,
      );
    }
    process.stderr.write(
      `✓ built ${pageEntries.length} pages, ${assetEntries.length} assets in ${manifest.durationMs}ms\n`,
    );
  }
}

try {
  const { values, positionals } = parseArgs({
    strict: true,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      root: { type: "string", default: "." },
      out: { type: "string", default: "dist" },
      pages: { type: "string", default: "pages" },
      public: { type: "string", default: "public" },
      json: { type: "boolean", default: false },
      "no-clean": { type: "boolean", default: false },
    },
  });

  if (values.help) {
    process.stderr.write("Usage: ssg build [--root <dir>] [--out <dir>]\n");
    process.exit(0);
  }

  if (values.version) {
    process.stderr.write("ssg 0.1.0\n");
    process.exit(0);
  }

  const cmd = positionals[0];
  if (cmd !== undefined && cmd !== "build") {
    process.stderr.write(`Unknown command: ${cmd}\n`);
    process.exit(1);
  }

  await runBuild(values as CliValues);
} catch (e) {
  process.stderr.write(`${(e as Error).message ?? String(e)}\n`);
  process.exit(1);
}
