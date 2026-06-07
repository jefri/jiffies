# Implementation Plan: SSG Build CLI

**Feature test:** `test/feature/ssg-build-cli.test.sh`
**User story:** A developer runs `node src/ssg/main.ts build --root <project>` and gets a deployable static site with bundled JS assets, correct exit codes, and optional JSON manifest output.

**Steps:**
- [ ] Step 1: CLI skeleton + recursive mkdir fix
- [ ] Step 2: Filesystem discovery + public passthrough
- [ ] Step 3: Rollup bundling + specifier rewrite
- [ ] Step 4: JSON output + size reporting

---

## Step 1: CLI skeleton + recursive mkdir fix

**Enables:** Test 3 (unknown flag exits non-zero), Test 2 (empty project exits 1); makes the CLI invokable at all.

### src/ssg/main.ts

Write `src/ssg/main.ts` as a clig.dev-compliant entry point following the pattern in `src/server/main.ts`.

```ts
#!/usr/bin/env node
// CLI entry point for `ssg build`. All diagnostics go to stderr.
// stdout is reserved exclusively for --json output.
```

Parse with `parseArgs({ strict: true })`. Strict mode causes `parseArgs` to throw on
any undeclared option, which propagates out of the module-level `try/catch` as
exit 1 — matching the server pattern.

Declared options at the top level: `--help`, `--version`.
Declared options under the `build` subcommand: `--root`, `--out`, `--pages`, `--public`, `--json`, `--no-clean`.

Subcommand dispatch: if `positionals[0] === "build"` (or no positional is given
and no top-level flag is set), run the build pipeline. Any other positional is an
unknown command → exit 1 with a message to stderr.

The build pipeline at this step: load config defaults, verify that `<root>/<pages>`
exists (stat it; if missing, write an error to stderr and `process.exit(1)`), then
call `build()` with an empty `pages` array. This skeleton exits 0 for a valid-but-empty
project; exit 1 for a missing pages dir fulfils test 2.

Stdout discipline: never call `console.log` or write to `process.stdout` in any
build-path code. All progress and error messages use `process.stderr.write()`.
This invariant must hold from this step forward so that the no-stdout assertion in
test 4 passes once `--json` is wired in step 4.

### src/fs_node.ts — recursive mkdir

Change `NodeFileSystemAdapter.mkdir` from `mkdir(path)` to
`mkdir(path, { recursive: true })`. `RecordFileSystemAdapter.mkdir` already
returns `Promise.resolve()`, so no change is needed there and all existing in-memory
tests continue to pass.

### src/ssg/ssg.ts — mkdir before writeFile

Before each `fs.writeFile(path, html)` in `build()`, call
`fs.mkdir(parentDirectory(path))` where `parentDirectory` strips the filename
from the path. With recursive mkdir this is idempotent. This ensures
`dist/about/index.html` can be written even though `dist/about/` does not yet exist.

---

## Step 2: Filesystem discovery + public passthrough

**Enables:** Assertions 1 (`dist/index.html` with `<h1>Home</h1>`), 2 (nested route
`dist/about/index.html`), 3 (group-folder strip → `dist/post/index.html`), 4
(`dist/style.css` public passthrough).

### src/ssg/discover.ts

New module. Export one async function:

```ts
/**
 * Scan `<rootDir>/<pagesDir>` recursively for `page.ts` sentinels.
 * Each sentinel becomes one PageDescriptor whose route is derived from the
 * folder path by stripping (group) segments (any folder whose name is wrapped
 * in parentheses) and treating the pages root as "/".
 *
 * Throws with a message naming `pagesDir` if it does not exist or contains no
 * sentinels. Caller should catch and exit 1.
 */
export async function discoverPages(
  rootDir: string,
  pagesDir: string,
): Promise<PageDescriptor[]>;
```

Route derivation rules:
- `pages/page.ts` → `/`
- `pages/about/page.ts` → `/about`
- `pages/(blog)/post/page.ts` → `/post` (the `(blog)` segment is dropped)
- Any folder segment whose name matches `/^\(.*\)$/` is dropped at any depth.

Dynamic-import each discovered `page.ts` using `import(absolutePath)` and extract
the default export as a `PageModule`. Pages are imported in parallel
(`Promise.all`).

Route collision detection: if two sentinels derive the same route after group
stripping, throw an error naming both source files.

### src/ssg/copy-public.ts

New module. Export:

```ts
/**
 * Copy every file under `<rootDir>/<publicDir>` verbatim into `<outDir>`.
 * Recurses into subdirectories. A missing `publicDir` is a no-op.
 * Ensures target directory exists (recursive mkdir) before each copy.
 */
export async function copyPublic(
  rootDir: string,
  publicDir: string,
  outDir: string,
): Promise<string[]>; // returns list of copied destination paths for size tracking
```

### Wire into main.ts

After discovering pages, call `build({ pages, out, fs })` then `copyPublic(...)`.
At this step the CLI writes no size report and no JSON — just exits 0.

---

## Step 3: Rollup bundling + specifier rewrite

**Enables:** Assertion 5 (no `.ts"` specifier in `dist/app/index.html`),
Assertion 6 (`dist/assets/*.js` exists).

### New dependency

Add `rollup` and `@rollup/plugin-node-resolve` to `package.json` dependencies.

### src/ssg/bundle.ts

New module. Export:

```ts
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
): Promise<Map<string, string>>; // specifier → "/assets/<file>"
```

Internal implementation outline (not code):
1. Collect distinct specifiers across all pages' `clientModules`.
2. Resolve each specifier to an absolute disk path under `rootDir`; record
   `specToPath: Map<specifier, diskPath>`.
3. Build a Rollup `input` record keyed by entry-name slugs (path relative to
   `rootDir`, separators replaced with `-`, extension stripped).
4. Run Rollup with:
   - `plugins`: a `transform` hook that runs `tsBlankSpace(code)` for `.ts` files,
     plus `@rollup/plugin-node-resolve` with `extensions: [".ts", ".js"]`.
   - `output`: `{ dir: "<outDir>/assets", format: "es", entryFileNames: "[name]-[hash].js", chunkFileNames: "[name]-[hash].js" }`.
5. Build `specToUrl` from output chunks: each entry chunk with `isEntry: true` has
   `name` (the slug) which maps back to the specifier via `nameToSpec`.
6. Return `specToUrl`.

### src/ssg/rewrite.ts

New module. Export:

```ts
/**
 * Rewrite `import "<S>";` lines inside <script type="module" defer> blocks in
 * `htmlContent`, replacing each original specifier `S` with the hashed asset URL
 * from `specToUrl`. Lines whose specifier is not in the map are left unchanged.
 *
 * This is a string substitution, not DOM parsing — the exact format emitted by
 * ssg.ts is `import "<S>";` on its own line inside the script block.
 */
export function rewriteClientSpecifiers(
  htmlContent: string,
  specToUrl: Map<string, string>,
): string;
```

### Wire into main.ts

After `build()` and `copyPublic()`, call `bundleClientModules(...)` to get
`specToUrl`, then for each discovered page read back the written HTML file,
call `rewriteClientSpecifiers`, and write it back. At this step the CLI still
writes no size report and no JSON.

---

## Step 4: Size reporting + JSON output

**Enables:** Test 4 (`--json` emits valid JSON to stdout; normal mode produces no stdout).

### Size collection

After all writes are complete, collect sizes for three categories:
- HTML files written by `build()` (one per page)
- Bundled JS assets under `<outDir>/assets/`
- Copied public files

For each, compute:
- `rawBytes`: `Buffer.byteLength(content, "utf8")`
- `gzipBytes`: `zlib.gzipSync(Buffer.from(content)).byteLength`

### BuildManifest type

```ts
export interface AssetEntry {
  path: string;    // relative to outDir, e.g. "index.html" or "assets/app-a1b2.js"
  rawBytes: number;
  gzipBytes: number;
}

export interface BuildManifest {
  pages: AssetEntry[];
  assets: AssetEntry[];
  public: AssetEntry[];
  durationMs: number;
}
```

### Output modes

**Normal mode (default):** Write a Vite-style table to `process.stderr`. Format:
```
dist/index.html            2.1 kB │ gzip: 0.9 kB
...
✓ built N pages, M assets in Xms
```
Nothing is written to stdout.

**`--json` mode:** Write `JSON.stringify(manifest, null, 2)` to `process.stdout`
(one `process.stdout.write` call). Write nothing to stderr (suppress size table).
No other stdout output anywhere in the pipeline.

This satisfies both halves of test 4: `--json` output parses as JSON, and the
normal invocation captures an empty stdout string.
