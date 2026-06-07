# SSG Build CLI


## Problem Statement

`src/ssg/ssg.ts` exports `build(BuildOptions)`, which renders a supplied
`PageDescriptor[]` to HTML and writes it through a `FileSystem` adapter. There
is no executable entry point: `src/ssg/main.ts` is empty. To produce a static
site in CI a developer must hand-write a Node script that constructs page
descriptors, wires a real-disk filesystem, and invokes `build()`.

Three gaps block a CI build today:

1. **No CLI.** Nothing discovers pages, loads configuration, or exposes
   `build()` to a shell with arguments, help text, and exit codes.
2. **Client modules are unbundled.** A page's `clientModules` are joined into a
   single `<script type="module" defer>` whose body is one `import "<spec>";`
   line per module, separated by newlines, emitted verbatim
   ([src/ssg/ssg.ts:104-106](../../../src/ssg/ssg.ts#L104-L106)). A `.ts`
   specifier does not resolve in a browser served from a static host. The dev
   server transpiles `.ts`→JS per request
   ([src/server/http/typescript.ts](../../../src/server/http/typescript.ts));
   a static build has no such server.
3. **Nested routes cannot be written.** `NodeFileSystemAdapter.mkdir` is
   non-recursive ([src/fs_node.ts:37-39](../../../src/fs_node.ts#L37-L39)) and
   `build()` never calls `mkdir` before `writeFile`, so `out/about/index.html`
   fails because `out/about/` does not exist.

This component turns `src/ssg/main.ts` into a clig.dev-compliant CLI that
discovers pages, renders them, bundles their client modules with Rollup, writes
a deployable static site, and reports per-file sizes for CI budget enforcement.

## Prior Art

- **`src/server/main.ts`** — the existing CLI pattern in this repo: shebang,
  `node:util.parseArgs` with `strict: true` (unknown flags throw and exit
  non-zero), top-level flag parsing before `main()`
  ([src/server/main.ts](../../../src/server/main.ts)). The SSG CLI mirrors this.
- **`src/ssg/ssg.ts` `build()`** — the rendering primitive this CLI wraps. It
  already supports `async` page `default()` and `head()`, so build-time data
  loading needs no new mechanism.
- **`src/fs_node.ts` `NodeFileSystem(cwd)`** — real-disk adapter; the CLI
  constructs one rooted at the project directory.
- **Next.js App Router** — inspiration for page discovery and the module
  contract: folders map to URL segments, a sentinel file (`page`) marks a
  routable URL, and a page is a single module exporting a default UI plus
  optional named lifecycle exports. Static-by-default rendering; `async`
  components load data at build time; `generateStaticParams()` expands dynamic
  segments. See `docs/research/2026-06-06-A-ssg-cli/nextjs-app-router.md`.
- **Vite build output** — the file-size report convention: a per-file table of
  filename, raw kB, and gzip kB. See
  `docs/research/2026-06-06-A-ssg-cli/public.md`.
- **Rollup v4 programmatic API** — `rollup(inputOptions)` then `bundle.write()`;
  sizes computed from `RollupOutput` chunks (`Buffer.byteLength` + `gzipSync`)
  since Rollup reports none. Same research file.

## Metrics

A deployed build operates acceptably when:

- **Correctness:** every discovered `page.ts` produces exactly one HTML file at
  the route derived from its folder path; every `clientModule` resolves to a
  bundled asset referenced by the emitted HTML; no `.ts` specifier survives into
  output HTML.
- **CI contract:** exit code is `0` on success and non-zero on any failure
  (missing config, render throw, bundle error, exceeded size budget, zero pages
  discovered). All diagnostics go to stderr; stdout carries only `--json`
  output.
- **Size visibility:** the build reports raw and gzip bytes for every emitted
  asset and HTML page. `--max-size` fails the build when a configured budget is
  exceeded.
- **Responsiveness:** first output (a "building…" line) appears before render
  begins, per clig.dev's 100ms guidance.

## Specification

### Stages

The CLI runs the pipeline below, then reports.

```text
clean      remove <out> if config.clean (default true)
discover   scan <root>/<pages> for page.ts sentinels → route list
load       dynamic-import each page module → PageModule
render     build(PageDescriptor[]) → HTML written to <out> (existing build())
assets     copy <root>/<public>/** verbatim into <out>
bundle     rollup the union of clientModules → hashed assets; rewrite HTML
report     size table (stderr) or JSON (stdout); enforce --max-size
```

The **clean** stage removes `<out>` (via `fs.rm`, recursive) before any write so
CI builds are reproducible and stale files from a prior build do not linger. It
is guarded to refuse a path outside `root` and is skipped with `--no-clean`. The
**assets** stage copies `<root>/<public>` (default `public`) verbatim into `<out>`
— favicons, CSS, images — using `fs.scandir`/`fs.copyFile`; absent directory is a
no-op. Asset files are size-tracked alongside HTML and bundles.

### Integration approach: decoupled post-pass

The CLI scans pages into `PageDescriptor[]`, calls the existing `build()`
unchanged to emit HTML, then runs Rollup and rewrites the client-entry script
tags in the written HTML files. `build()` keeps its current contract and its 14
tests; the bundler concern lives entirely in the CLI; the rewrite is a bounded
substitution against the exact specifier strings the CLI already knows from each
page's `clientModules`. (Alternatives considered below.)

### Page discovery (App Router model)

Scan `<root>/<pages>` (default `pages`) recursively. A folder becomes a route
only if it directly contains a sentinel `page.ts`. The route is the chain of
folder names from the pages root to that folder:

| File on disk | Route |
|---|---|
| `pages/page.ts` | `/` |
| `pages/about/page.ts` | `/about` |
| `pages/blog/index/page.ts` | `/blog/index` |
| `pages/(marketing)/home/page.ts` | `/home` |

`(group)` folders are dropped from the URL at any depth (organization only).
Folders without a `page.ts` contribute structure but no route. Dynamic `[slug]`
segments are reserved for M4 (see Summary).

Route collisions are an error: if two `page.ts` files derive the same route — for
example `(a)/home/page.ts` and `(b)/home/page.ts` after groups are dropped — the
build aborts (exit 1) naming both source files. Discovered routes and any
explicit `config.routes` are merged into one route table; a collision between
them is the same error, so neither silently shadows the other.

### Page module contract

Discovery imports each `page.ts` and reads the existing `PageModule` interface
([src/ssg/ssg.ts:6-11](../../../src/ssg/ssg.ts#L6-L11)) — unchanged:

```ts
export interface PageModule {
  /** Page UI. May be async to load data (fetch/fs/db) at build time. */
  default: () => Node | Node[] | Promise<Node | Node[]>;
  /** Document head nodes (title, meta). */
  head?: () => Node | Node[] | Promise<Node | Node[]>;
  /** <html lang>. Defaults to "en". */
  lang?: string;
  /** Client entry specifiers; bundled and injected as module scripts. */
  clientModules?: string[];
}
```

Build-time data loading needs no new field: `default()` already returns a
`Promise`, so a page awaits its data and renders the result to static HTML —
the App Router "async server component" model, minus the framework.

### Configuration

Configuration is an executable module, because `PageModule.default` is a
function and cannot be expressed as JSON. The CLI auto-discovers `ssg.config.ts`
in the project root, overridable with `--config <file>`:

```ts
import { defineConfig } from "@davidsouther/jiffies/ssg/main.ts";

export interface SsgConfig {
  /** Directory scanned for page.ts files, relative to root. Default "pages". */
  pages?: string;
  /** Explicit routes, merged with discovered ones; a collision is an error. */
  routes?: PageDescriptor[];
  /** Output directory, relative to root. Default "dist". */
  out?: string;
  /** Project root; relative paths resolve against this. Default cwd. */
  root?: string;
  /** Static files copied verbatim into out. Relative to root. Default "public". */
  public?: string;
  /** Remove out before building. Default true. */
  clean?: boolean;
}

export function defineConfig(c: SsgConfig): SsgConfig; // identity + type help

export default defineConfig({ out: "dist", pages: "pages" });
```

Config is optional: with no config file and no flags, the CLI scans `./pages`
into `./dist`, rooted at cwd. Flags override config; config overrides defaults.

### CLI surface

```text
ssg build [options]      Build the static site (default command)
ssg --help | --version

Options:
  --config <file>   Config module path        (default: ssg.config.ts if present)
  --root <dir>      Project root               (default: cwd)
  --pages <dir>     Pages directory            (default: pages)
  --out <dir>       Output directory           (default: dist)
  --public <dir>    Static passthrough dir     (default: public)
  --no-clean        Keep existing files in out (default: out is cleaned)
  --max-size <n>    Fail if any asset exceeds n bytes   (default: none)
  --json            Emit build manifest to stdout instead of a table
  --quiet           Suppress the size table (errors still print)
  -h, --help        Show help
  --version         Show version
```

Parsed with `node:util.parseArgs`, `strict: true`. With no arguments — and with
bare flags such as `ssg --out foo` and no `build` token — the CLI runs `build`
with the resolved options. `--version` prints the `version` field read from the
package's `package.json`. `--help` leads with an example invocation, per
clig.dev.

### Bundling (Rollup, shared chunks)

Collect the distinct `clientModules` specifiers across all pages — one Rollup
entry each — so a shared hydration core hoists into a single common chunk rather
than duplicating per page. Three maps bridge the original HTML specifier to the
final asset URL; spelling them out is the crux of the rewrite:

1. **Resolve.** For each distinct original specifier `S` (the exact string the
   page wrote, e.g. `"/demo/hydration/client.ts"`), resolve it to an absolute
   disk path `P` under `root`. Keep `specToPath: Map<S, P>`.
2. **Entry-name.** Key the Rollup `input` map by a slug derived from `P`
   relative to `root` — path separators replaced with `-` and the extension
   stripped (e.g. `demo/hydration/client.ts` → `demo-hydration-client`). This
   guarantees uniqueness: two `client.ts` in different folders get distinct
   names, avoiding `[name]` collisions in `entryFileNames`. Keep
   `nameToSpec: Map<entryName, S>`.
3. **Build + map output.** After `bundle.write()`, each entry chunk in
   `RollupOutput.output` has `isEntry: true`, a `name` (the entry-name), and a
   `fileName` (`<entry-name>-<hash>.js`). Build `specToUrl: Map<S,
   "/assets/<fileName>">` by joining `nameToSpec[chunk.name] → S` with
   `chunk.fileName`. (`facadeModuleId` — the absolute path `P` — is an
   equivalent join key via `specToPath`; `chunk.name` is used here because it
   maps directly to the entry-name.)

Rollup configuration:

- **input:** `{ "<entry-name>": "<resolved disk path P>", ... }`
- **plugins:** a small `transform` plugin wrapping `ts-blank-space`
  ([src/transpile.mjs](../../../src/transpile.mjs) already uses it) plus
  `@rollup/plugin-node-resolve` with `extensions: [".ts", ".js"]` so
  `.ts`-extension imports resolve. (`@rollup/plugin-typescript` is rejected in
  Alternatives.)
- **output:** `{ dir: "<out>/assets", format: "es", entryFileNames:
  "[name]-[hash].js", chunkFileNames: "[name]-[hash].js" }`.

**Rewrite.** For each written HTML file, rewrite the client-entry script
([src/ssg/ssg.ts:104-106](../../../src/ssg/ssg.ts#L104-L106)) in place: replace
each `import "<S>";` with `import "<specToUrl[S]>";`, leaving the surrounding
`<script type="module" defer>` intact. This handles a page with multiple
`clientModules` (each `import` line is rewritten independently) without
flattening them into one tag. The browser loads the inline module, which imports
the hashed entry chunks; those chunks' imports of shared chunks are relative and
browser-resolvable, so no further rewriting is needed.

New dev dependencies: `rollup`, `@rollup/plugin-node-resolve`.

### File-size tracking

Rollup reports no byte sizes. For each emitted asset chunk
(`Buffer.byteLength(code, "utf8")`) and each HTML page, compute raw bytes and
gzip bytes (`zlib.gzipSync(...).byteLength`). Default output is a Vite-style
table to **stderr**:

```text
dist/index.html            2.1 kB │ gzip: 0.9 kB
dist/about/index.html      1.8 kB │ gzip: 0.8 kB
dist/assets/core-c3d4.js  12.4 kB │ gzip: 4.1 kB
dist/assets/client-a1b2.js 3.2 kB │ gzip: 1.2 kB
✓ built 2 pages, 2 assets in 412ms
```

`--json` writes the same data as a manifest object to **stdout** (the only
stdout output, so the build composes in pipelines). `--max-size <n>` fails the
build (exit 1) when any single asset's raw size exceeds `n` bytes, with the
offending file named in the stderr error.

clig.dev compliance: `src/log.ts` routes `info` to stdout and `warn`/`error` to
stderr. The size table and progress lines are human diagnostics, so they bypass
`log.info` and write directly to `process.stderr`. stdout is reserved for
`--json`.

### Required supporting change: recursive mkdir

`build()` must ensure a page's parent directory exists before `writeFile`.
`NodeFileSystemAdapter.mkdir` changes to `{ recursive: true }` (idempotent), and
`build()` calls `fs.mkdir` on the target directory before each write. This is a
no-op for `RecordFileSystemAdapter` (its `mkdir` already returns immediately) so
existing in-memory tests are unaffected, and it fixes nested-route output for
all adapters.

### Failure modes

| Condition | Behavior | Exit |
|---|---|---|
| `--config` file missing | stderr error naming the path | 1 |
| Page module throws during render | stderr error naming the route | 1 |
| `clientModule` specifier unresolvable | stderr error naming the specifier and page | 1 |
| Rollup bundle error | Rollup diagnostics to stderr | 1 |
| Asset exceeds `--max-size` | stderr error naming file + size + budget | 1 |
| Zero pages discovered | stderr error naming the scanned pages dir | 1 |
| Unknown flag | `parseArgs` throws | 1 |
| Success | size table (stderr) or manifest (stdout) | 0 |

Input is validated before any file is written: config loads and pages are
discovered first; a discovery or load failure aborts before `build()` writes.

### Verification

**Automated:**

- Discovery: fixture page trees through `RecordFileSystemAdapter`; assert route
  derivation incl. `(group)` drop, root `/`, folders without `page.ts`, and that
  a route collision aborts naming both sources.
- Render + nested dirs: `build()` over a nested route into a Node temp dir;
  assert `out/about/index.html` exists (the mkdir-p fix).
- Clean: a stale file in `out` is removed before build by default and preserved
  under `--no-clean`; a `public/` fixture is copied verbatim into `out`.
- Bundling: a fixture page with multiple `clientModules`; assert hashed assets
  under `out/assets`, that each `import` specifier in the HTML is rewritten to
  its asset URL, and that no `.ts` specifier survives.
- Sizing: assert the manifest reports raw and gzip bytes per asset, page, and
  copied public file; `--max-size` fails on an oversized fixture.
- CLI contract: exit codes per the failure table; `--json` writes only to
  stdout; size table writes only to stderr; unknown flag exits non-zero.

**Manual:**

- Run `node src/ssg/main.ts build` against `demo/hydration/` adapted to the
  `pages/` convention; serve `dist/` with a plain static server; confirm the
  page hydrates with no network 404s for `.ts` files.

## Alternatives

**Integration — Bundle-first manifest (B).** Bundle before rendering and pass an
asset manifest into `build()` so HTML emits final in one pass with no rewrite.
Rejected for now: it couples `build()` to the bundler and prevents `build()`
from running standalone (or forces an optional-manifest branch). Approach A
keeps `build()`'s contract intact. B remains a clean evolution if the
read-modify-write cost of A's HTML rewrite ever matters.

**Integration — Full orchestrator (C).** `main.ts` owns the whole pipeline using
lower-level `renderToString`/ssg helpers and demotes `build()` to a primitive.
Most flexible, most invasive; discards existing `build()` tests. Deferred.

**Config — JSON manifest of module paths.** A JSON file mapping routes to module
paths, imported by the CLI. Rejected: adds a parallel indirection when an
executable config already expresses everything directly, and the App Router
model derives routes from the filesystem without a manifest at all.

**Bundler — esbuild or `@rollup/plugin-typescript`.** esbuild is a heavier
transpile-only dependency; `@rollup/plugin-typescript` runs the full compiler
and fights `allowImportingTsExtensions`. The repo already depends on
`ts-blank-space`; a 10-line transform plugin reuses it. The task specifies
Rollup.

**Off-the-shelf SSG (Astro, 11ty, Vite SSG).** Each brings its own component
model and would not render this repo's `FC`/`renderToString` DOM output without
a custom integration layer larger than this CLI. The goal is to ship this repo's
existing `build()` to CI, not adopt a framework.

## Summary

A clig.dev-compliant CLI in `src/ssg/main.ts` wraps the existing `build()` with
App Router-style filesystem discovery, Rollup bundling of client modules with
specifier rewriting, and Vite-style file-size tracking with a CI size budget.
The integration is a decoupled post-pass so `build()` keeps its current contract
and tests. One supporting change (recursive mkdir) fixes nested-route output.

**Milestones** (basis for the plan phase):

- **M1** — CLI skeleton: `build` command, `--config/--root/--pages/--out/
  --help/--version`, exit codes, stderr discipline, recursive-mkdir fix, `out`
  clean (`--no-clean`), HTML size report. Driven by explicit `defineConfig`
  routes.
- **M2** — Filesystem routing: `pages/` scan, `page.ts` sentinel, `(group)`
  folders, collision detection, `public/` passthrough, async build-time data
  loading.
- **M3** — Rollup bundling + specifier rewrite + asset size table + `--max-size`.
- **M4 (deferred)** — Dynamic `[slug]`/`[...slug]` segments and a
  `generateStaticParams()` named export for build-time route expansion.

**Deferred technical decisions:**

- Whether `head` should also accept a static `metadata` object export (App
  Router's `export const metadata`) in addition to the existing `head()`
  function. Left to M2 when discovery exercises the contract.
- Asset hashing strategy for cache-busting beyond Rollup's `[hash]` (e.g. a
  manifest file for server integration). Revisit if the deferred SSR middleware
  task lands.
- Whether `--max-size` should support per-route or total-size budgets in
  addition to per-asset. Start with per-asset; extend if a real budget needs it.
