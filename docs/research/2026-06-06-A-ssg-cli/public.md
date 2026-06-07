# SSG / Build-Tool CLI Design Research

Research date: 2026-06-06. Scope: configuration/entry-point conventions across
Eleventy, Astro, and Vite (Topic 1), and the Rollup v4 programmatic API for a
custom build CLI (Topic 2).

Project-relevant facts confirmed from the local repo: `tsconfig.json` already
sets `module: ESNext`, `moduleResolution: bundler`, and
`allowImportingTsExtensions: true`; `package.json` depends on
`ts-blank-space@^0.7.0`; there is no Rollup dependency installed yet. These
constraints shape the Topic-2 recommendation below.

---

## TOPIC 1 — SSG / build-tool CLI config conventions

### Summary table

| Dimension | Eleventy (v3) | Astro (v5) | Vite (v5/v6) |
|---|---|---|---|
| Config format | Function that receives `eleventyConfig`, optionally returns a config object [1] | `export default defineConfig({...})` from `astro/config` [4][5] | `export default defineConfig({...})` from `vite`, or a function for conditional config [7][8] |
| Default config filenames | `.eleventy.js`, `eleventy.config.js`, `eleventy.config.mjs`, `eleventy.config.cjs` (first found wins) [1] | `astro.config.mjs` / `.js` / `.ts` / `.cjs` [4][5] | `vite.config.js` / `.mjs` / `.ts` / `.cjs` / `.mts` / `.cts` [7] |
| `--config` flag | `--config=myconfig.js` [2] | `--config <path>` [6] | `-c, --config <file>` (resolved relative to cwd) [7][9] |
| Route/page discovery | Directory scan of `dir.input` filtered by `templateFormats` [1] | File-system routing over `src/pages/` (no route list) [3][5] | Explicit `build.rollupOptions.input` entries (Vite is not file-routed; SSG layered on top, e.g. Astro/SvelteKit, adds routing) [10] |
| Output reporting | Writes file list; `--quiet` suppresses it; `--dryrun`/`--to=json` for no-write [2] | Pages built + timing; `dist/` default | Per-file table: filename, raw kB, gzip kB, plus timing [10][12] |

### Eleventy (11ty)

**Config format.** Eleventy's config file exports a function that receives the
`eleventyConfig` object and may return a plain config object [1]:

```js
// eleventy.config.js
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("css");
  return {
    dir: { input: "src", output: "dist", includes: "_includes", layouts: "_layouts", data: "_data" },
    templateFormats: ["md", "njk", "html", "11ty.js"],
  };
}
```

The function may be sync or async, ESM or CJS [1]. Directory defaults:
`dir.input` = `.`, `dir.output` = `_site`, `dir.includes` = `_includes`,
`dir.data` = `_data` [1].

**Config location.** Eleventy searches the project root for, in order,
`.eleventy.js`, `eleventy.config.js`, `eleventy.config.mjs`,
`eleventy.config.cjs`; the first found is used and the rest ignored [1]. Override
with `--config=myeleventyconfig.js` [2].

**Page discovery.** Convention-based: it recursively scans `dir.input` and
processes any file whose extension is in `templateFormats` (default set includes
`html,liquid,ejs,md,hbs,mustache,haml,pug,njk,11ty.js`) [1]. There is no explicit
page manifest; the file tree is the route table. `--formats=md,html` narrows the
set at the CLI [2].

**CLI flags/subcommands.** Eleventy is a single command (no subcommands); behavior
is flag-driven [2]:
`--input`, `--output`, `--config`, `--serve` (hot-reloading dev server),
`--watch` (rebuild without server), `--port`, `--formats`, `--quiet`, `--dryrun`,
`--incremental`, `--to=fs|json|ndjson`, `--help`, `--version` [2].

**Output reporting.** By default it logs each written file and a summary count +
elapsed time; `--quiet` reduces logging, `--dryrun` runs without writing, and
`--to=json`/`--to=ndjson` emit structured build results instead of files [2].

### Astro

**Config format.** `astro.config.mjs` (`.js` / `.ts` / `.cjs` also accepted) using
the `defineConfig` helper for IntelliSense [4][5]:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
export default defineConfig({
  srcDir: "./src",
  outDir: "./dist",
  publicDir: "./public",
  output: "static", // or "server"
});
```

Key top-level options: `root`, `srcDir` (default `./src`), `publicDir`
(`./public`), `outDir` (`./dist`), `output` (`static` | `server`), `adapter`,
and `build.format` (`file` | `directory` | `preserve`), `build.assets`
(default `_astro`) [5].

**Config location.** Found via `--config <path>` or auto-discovered as
`astro.config.mjs` in the project root [6].

**Page discovery.** Pure file-system routing under `src/pages/`. Any `.astro`,
`.md`, `.mdx`, `.html`, or `.js`/`.ts` file becomes a route mirroring its path;
`[slug].astro` brackets denote dynamic segments. No separate route config to
maintain [3][5].

**CLI subcommands/flags.** Subcommand-based: `astro dev`, `astro build`,
`astro preview`, plus `astro add`, `astro check`, `astro sync` [6]. Common flags:
`--root`, `--config`, `--outDir`, `--site`, `--base`, `--port`, `--host`,
`--verbose`, `--silent`, `--open`, and global `--help` / `--version` [6].
`astro build` emits to `dist/` by default [6].

**Output reporting.** `astro build` logs each route/page as it is generated and a
build-completed summary with timing; output lands in `dist/` [6].

### Vite

**Config format.** `vite.config.ts` (or `.js`/`.mjs`/`.cjs`/`.mts`/`.cts`) with
`defineConfig`; a function form receives `{ command, mode, isSsrBuild,
isPreview }` for conditional config [7][8]:

```ts
// vite.config.ts
import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: { input: { main: "index.html", admin: "admin.html" } },
    reportCompressedSize: true,
  },
});
```

**Config location.** Auto-resolves `vite.config.*` in the project root; override
with `-c, --config <file>` (resolved relative to cwd) [7][9].

**Page/entry discovery.** Vite itself is not file-routed. Build inputs are
declared explicitly via `build.rollupOptions.input` (an HTML entry, or an object
of named entries); for an app it defaults to `index.html`. File-system routing is
a concern of frameworks layered on top (Astro, SvelteKit), not Vite core [10].

**CLI subcommands/flags.** `vite` / `vite dev` / `vite serve` (aliases for the dev
server), `vite build`, `vite preview`, `vite optimize` [9]. Common options:
`-c, --config <file>`, `--base <path>`, `-m, --mode <mode>`,
`-l, --logLevel <level>`, `--clearScreen`, `-d, --debug`, `-f, --filter`,
`-h, --help`, `-v, --version`. Build-specific: `--outDir <dir>` (default `dist`),
`--target`, `--minify`, `--sourcemap`, `-w, --watch`. Dev-specific: `--host`,
`--port`, `--open`, `--cors`, `--strictPort` [9].

**Output reporting.** After `vite build` Vite prints a per-file table with the
output path, raw size in kB, and gzip size, e.g.
`dist/assets/index-d72a4b98.css   760.55 kB │ gzip: 104.73 kB`, followed by total
build time [10][12]. Gzip reporting is toggled by `build.reportCompressedSize`
(default `true`); disabling it speeds large builds [11]. This per-file
size+gzip+timing table is the de-facto convention worth emulating in a custom
SSG CLI.

---

## TOPIC 2 — Rollup v4 programmatic (JavaScript) API

### Core build flow: `rollup.rollup()` → `generate` vs `write`

`rollup.rollup(inputOptions)` builds the module graph and tree-shakes but emits
nothing. It returns a `bundle`. `bundle.generate(outputOptions)` renders output
**in memory** (returns a `RollupOutput`); `bundle.write(outputOptions)` renders
**and writes to disk** (also returns a `RollupOutput`). `generate` can be called
multiple times for different formats. Always `bundle.close()` when done so plugins
run their `closeBundle` cleanup [13]:

```js
import { rollup } from "rollup";

async function build(inputOptions, outputOptionsList) {
  let bundle;
  try {
    bundle = await rollup(inputOptions);
    // bundle.watchFiles -> string[] of files this build depends on
    for (const outputOptions of outputOptionsList) {
      const { output } = await bundle.generate(outputOptions); // in-memory
      // const { output } = await bundle.write(outputOptions);  // to disk
      report(output);
    }
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    if (bundle) await bundle.close();
  }
}
```

### `RollupOutput` structure and per-output byte size

`RollupOutput.output` is a non-empty array mixing **chunks** and **assets**,
discriminated by the `type` field [13]:

- `type === 'chunk'`: has `code` (string), `fileName`, `map`, `isEntry`,
  `isDynamicEntry`, `name`, `exports`, `imports`, `dynamicImports`, `modules`,
  `facadeModuleId`, etc.
- `type === 'asset'`: has `source` (`string | Uint8Array`), `fileName`, `name`.

Byte sizes are not provided by Rollup; compute them from `code` / `source`. Use
`Buffer.byteLength` for strings and `.byteLength` for `Uint8Array` [13]:

```js
import { gzipSync } from "node:zlib";

function report(output) {
  for (const item of output) {
    let bytes;
    if (item.type === "asset") {
      bytes = typeof item.source === "string"
        ? Buffer.byteLength(item.source, "utf8")
        : item.source.byteLength;          // Uint8Array
    } else {
      bytes = Buffer.byteLength(item.code, "utf8"); // chunk
    }
    const raw = item.type === "asset" ? item.source : item.code;
    const gzip = gzipSync(typeof raw === "string" ? Buffer.from(raw) : raw).byteLength;
    console.log(`${item.fileName}  ${(bytes / 1024).toFixed(2)} kB  gzip: ${(gzip / 1024).toFixed(2)} kB`);
  }
}
```

This reproduces the Vite-style raw+gzip+filename table without any plugin and is
the recommended approach for a custom CLI: it sees the final post-processed bytes,
whereas module-summing plugins measure pre-post-processing sizes [14][16].

### Reporting bundle sizes: plugin vs. compute-from-output

`rollup-plugin-filesize` prints a CLI size summary and exposes
`minSize`, `gzipSize`, `brotliSize`, `bundleSize`, `fileName` (and `*Before`
fields when `showBeforeSizes` is enabled) to a custom `reporter` [14]:

```js
import filesize from "rollup-plugin-filesize";
// plugins: [filesize({ reporter: (opts, bundle, { gzipSize, bundleSize, fileName }) => {} })]
```

Note: some size plugins (e.g. `rollup-plugin-sizes`) sum module sizes reported by
Rollup *after tree-shaking but before post-processing*, so they exclude format
boilerplate/shims and minification effects [16]. For an SSG CLI that wants to
report exactly what is shipped, computing from the `RollupOutput` (above) is more
accurate than a module-summing plugin, and avoids an extra dependency.

### Bundling TypeScript with `.ts`-extension imports — plugin choices

Three viable approaches, ordered by fit for this project:

1. **A small custom plugin wrapping `ts-blank-space`** (recommended here). The
   project already uses `ts-blank-space` and `allowImportingTsExtensions: true`
   with `moduleResolution: bundler`. `allowImportingTsExtensions` is only legal
   under `noEmit`/`emitDeclarationOnly` because the resolver (the bundler) is
   expected to make `.ts` imports work [17][18]. A type-stripping `transform` hook
   plus `@rollup/plugin-node-resolve` configured to resolve `.ts` first handles
   both stripping and `.ts`-import resolution:

   ```js
   import { nodeResolve } from "@rollup/plugin-node-resolve";
   import tsBlankSpace from "ts-blank-space";

   const tsBlank = {
     name: "ts-blank-space",
     transform(code, id) {
       if (!id.endsWith(".ts") && !id.endsWith(".tsx")) return null;
       return { code: tsBlankSpace(code), map: null };
     },
   };

   const inputOptions = {
     input: "src/page/client.ts",
     plugins: [
       nodeResolve({ extensions: [".ts", ".tsx", ".js", ".mjs", ".json"] }),
       tsBlank,
     ],
   };
   ```

   `ts-blank-space` only erases types (no downleveling), so the `.ts` specifiers
   survive stripping and node-resolve maps them to real files. This keeps the
   exact pipeline the repo already uses [17][19].

2. **`@rollup/plugin-typescript`** — full TS compiler integration. Install with
   `npm i -D @rollup/plugin-typescript` (peer deps `typescript` + `tslib`); it
   reads `compilerOptions` from `tsconfig.json` by default and targets `.ts`/`.tsx`
   [15]:

   ```js
   import typescript from "@rollup/plugin-typescript";
   export default { input: "src/index.ts", output: { dir: "output", format: "es" }, plugins: [typescript()] };
   ```

   Drawback for this project: it invokes the real compiler and resists
   `allowImportingTsExtensions` (that flag forbids emit), so it would require
   tsconfig overrides and is heavier than type-stripping.

3. **esbuild** (`@rollup/plugin-esbuild` / `rollup-plugin-esbuild`) — fast
   transpile-only TS, comparable to the ts-blank-space approach but adds a binary
   dependency. esbuild can also rewrite/resolve `.ts` specifiers. Reasonable if you
   later need downleveling that ts-blank-space does not do [17][19].

In all cases, pair with `@rollup/plugin-node-resolve` (with `.ts` in
`extensions`) so bare and relative `.ts` imports resolve, and
`@rollup/plugin-commonjs` only if any dependency ships CommonJS.

### Multiple independent entry points (one bundle per page client module)

Two strategies:

- **One Rollup build, many named entries** via the `input` map. Rollup
  code-splits shared modules into common chunks automatically [13][20]:

  ```js
  const inputOptions = {
    input: { home: "src/pages/home/client.ts", about: "src/pages/about/client.ts" },
    plugins: [/* node-resolve, ts-blank-space */],
  };
  // output: { dir: "dist/_assets", format: "es", entryFileNames: "[name]-[hash].js" }
  ```

  `input` accepts a string (single), an array (multiple, names derived from
  filenames), or an object (explicit names) [13]. With `output.dir` set, all
  entries emit into that directory and the `RollupOutput.output` array contains a
  chunk per entry plus any shared chunks; iterate it for the size report.

- **Independent builds per page** — call `rollup()` once per page when you want
  fully isolated bundles with no shared chunking (simpler isolation, but
  duplicates shared code). Loop over pages, awaiting each `build()` and merging
  the per-build `output` arrays into one report.

For an SSG where each page's client module is meant to be independent, the
single-build named-entries form is usually preferred: shared runtime
(e.g. the hydration core) is hoisted into a common chunk once rather than copied
into every page bundle [13][20].

---

## Concrete recommendation for the jiffies SSG CLI

- Adopt a **subcommand CLI** (`build`, `dev`/`serve`) like Astro/Vite rather than
  Eleventy's flag-only single command; keep `--config`, `--out`/`--outDir`,
  `--help`, `--version` as the cross-tool baseline.
- Config: a `*.config.ts` exporting a `defineConfig({...})` default (Vite/Astro
  convention) auto-discovered in cwd, overridable with `--config`.
- Page discovery: file-system scan (Eleventy/Astro convention) is the lowest-
  friction route table; emit one Rollup named entry per page client module.
- Build: drive Rollup programmatically with `rollup()` + `bundle.write()`, then
  print a Vite-style raw+gzip+filename+timing table computed from
  `RollupOutput.output` via `Buffer.byteLength` + `zlib.gzipSync` — no size plugin
  needed.
- TS: a tiny `ts-blank-space` `transform` plugin + `@rollup/plugin-node-resolve`
  (with `.ts` in `extensions`) matches the repo's existing
  `allowImportingTsExtensions` / `moduleResolution: bundler` setup.

---

**Sources**

[1] Eleventy, "Configuration." https://www.11ty.dev/docs/config/

[2] Eleventy, "Command Line Usage." https://www.11ty.dev/docs/usage/

[3] Astro, "Routing." https://docs.astro.build/en/guides/routing/

[4] Astro, "Configuration Overview." https://docs.astro.build/en/guides/configuring-astro/

[5] Astro, "Configuration Reference." https://docs.astro.build/en/reference/configuration-reference/

[6] Astro, "CLI Reference." https://docs.astro.build/en/reference/cli-reference/

[7] Vite, "Configuring Vite." https://vite.dev/config/

[8] Vite, "Build Options." https://vite.dev/config/build-options

[9] Vite, "Command Line Interface." https://vite.dev/guide/cli.html

[10] Vite, "Building for Production." https://vite.dev/guide/build

[11] Vite, "Build Options — reportCompressedSize." https://vite.dev/config/build-options

[12] Vite issue #11288, "Missing gzip information for HTML files in build logs output." https://github.com/vitejs/vite/issues/11288

[13] Rollup, "JavaScript API." https://rollupjs.org/javascript-api/

[14] ritz078, "rollup-plugin-filesize." https://github.com/ritz078/rollup-plugin-filesize

[15] rollup/plugins, "@rollup/plugin-typescript." https://www.npmjs.com/package/@rollup/plugin-typescript (README: https://github.com/rollup/plugins/tree/master/packages/typescript)

[16] tivac, "rollup-plugin-sizes." https://github.com/tivac/rollup-plugin-sizes

[17] TypeScript, "TSConfig Option: allowImportingTsExtensions." https://www.typescriptlang.org/tsconfig/allowImportingTsExtensions.html

[18] microsoft/TypeScript issue #62342, "Enable `--allowImportingTsExtensions` by default." https://github.com/microsoft/TypeScript/issues/62342

[19] evanw/esbuild issue #2435, "Rewriting `.ts` module specifiers to `.js` without a plugin." https://github.com/evanw/esbuild/issues/2435

[20] rollup/rollup issue #3325, "Supporting multiple entries/inputs in the Javascript API." https://github.com/rollup/rollup/issues/3325
