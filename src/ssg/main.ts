#!/usr/bin/env node
// CLI entry point for `ssg build`. All diagnostics go to stderr.
// stdout is reserved exclusively for --json output.

import * as process from "node:process";
import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
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

async function runBuild(values: CliValues): Promise<void> {
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
  await copyPublic(rootDir, values.public, outDir);

  const specToUrl = await bundleClientModules(pages, rootDir, outDir);
  if (specToUrl.size > 0) {
    for (const { route, module } of pages) {
      if (!module.clientModules?.length) continue;
      const segment = route.replace(/^\//, "");
      const htmlPath = segment
        ? `${outDir}/${segment}/index.html`
        : `${outDir}/index.html`;
      const original = await readFile(htmlPath, "utf-8");
      await writeFile(
        htmlPath,
        rewriteClientSpecifiers(original, specToUrl),
        "utf-8",
      );
    }
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
