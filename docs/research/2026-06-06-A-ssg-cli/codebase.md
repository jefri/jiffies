# SSG Build Implementation Research

## 1. THE BUILD FUNCTION: `src/ssg/ssg.ts`

### Function Signature

**File:** `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:70`

```typescript
export async function build({ pages, out, fs }: BuildOptions): Promise<void>
```

### BuildOptions Interface

**File:** `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:20-24`

```typescript
export interface BuildOptions {
  pages: PageDescriptor[];
  out: string;
  fs: FileSystem;
}
```

### PageDescriptor Interface

**File:** `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:14-17`

```typescript
export interface PageDescriptor {
  route: string;
  module: PageModule;
}
```

### PageModule Interface

**File:** `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:6-11`

```typescript
export interface PageModule {
  default: () => Node | Node[] | Promise<Node | Node[]>;
  head?: () => Node | Node[] | Promise<Node | Node[]>;
  lang?: string;
  clientModules?: string[];
}
```

### Behavior Overview

The `build()` function iterates over each page in `BuildOptions.pages` and performs these steps:

1. **Lines 71-76:** Render body and head to strings
   - Awaits `module.default()` and `module.head()` (both can return promises)
   - Uses `renderToString()` from `src/dom/render.ts:10` to convert DOM nodes to HTML strings

2. **Lines 78-81:** Parse bodyStr into a DOM template and scan custom elements
   - Creates a `<template>` element and parses the HTML
   - Calls `scanAllUnits()` (lines 31-44) to find all custom element instances

3. **Lines 83-86:** Build hydration payload if custom elements exist
   - Calls `buildPayload(props)` to serialize component state
   - Injects a `<script type="application/json" id="__hydration">` tag with the payload

4. **Lines 88-97:** Add defer-hydration attribute to nested custom elements
   - Finds custom elements that have custom element ancestors
   - Uses regex replace on bodyStr to inject `defer-hydration` attribute

5. **Lines 99-102:** Inject capture stub when hydration is needed
   - Condition: `allUnits.length > 0 || clientModules.length > 0`
   - The stub source (`captureStubSource`) is a string defining inline JavaScript that sets up event capture queue
   - Injected as `<script>${captureStubSource}</script>` (inline, synchronous)

6. **Lines 104-107:** Inject deferred client-entry module script if clientModules is set

7. **Lines 109-114:** Assemble final HTML and write to filesystem

### clientModules Details

**Property:** `PageModule.clientModules?: string[]` (line 10)

**What it represents:** An array of import specifier strings (file paths/module identifiers)

**How they are emitted into HTML:**

- **Lines 104-106:** The strings are written verbatim into `import "..."` statements:
  ```typescript
  const imports = clientModules.map((m) => `import "${m}";`).join("\n");
  bodyStr = `${bodyStr}<script type="module" defer>\n${imports}\n</script>`;
  ```

- **Example output:**
  ```html
  <script type="module" defer>
  import "/demo/hydration/client.ts";
  </script>
  ```

- **Key characteristic:** The strings are **emitted as-is** — no path transformation, no bundling. They are import specifiers that the browser or server must resolve.

- **Step 6 source:** `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:104-107`

---

## 2. CLIENT MODULES & BUNDLING GAP

### Path Handling

The `clientModules` strings are **written verbatim** into `import "..."` statements with no transformation. They are import specifiers expected to be resolved by:
- The browser's module loader (if served over HTTP)
- A server-side import resolution system (if in a Node.js environment)

### Existing Bundling/Compilation Tools

**Search results for bundling tools:**

- **NO rollup, esbuild, or tsc invocations found** in the SSG build pipeline
- **ts-blank-space IS used** for runtime transpilation (see below)

**File references:**
- `package.json:37`: `"ts-blank-space": "^0.7.0"` (dependency)
- `src/transpile.mjs:1-16`: Transpilation utility using ts-blank-space

### Dev Server TypeScript Transpilation

**File:** `/Users/david.souther/devel/jefri/jiffies/src/server/http/typescript.ts`

The dev server **transpiles TypeScript on the fly** using `ts-blank-space`:

- **Lines 18-46:** `tsFileServer` middleware
  - Condition: Request URL ends with `.js` or `.ts` (line 21)
  - For `.ts` files (lines 32-35):
    - Calls `transpile(filename, () => fs.readFile(filename))` from `src/transpile.mjs`
    - Returns JavaScript with types stripped (using ts-blank-space)
    - Sets `SourceMap` header pointing to `.ts.map` file
  - For `.js` files (lines 36-41): Returns as-is

- **Lines 7-12:** `render()` function modifies import specifiers:
  ```typescript
  source = source
    .replaceAll(`from "@`, 'from "/@')
    .replaceAll(`import("@`, 'import("/@');
  ```
  This converts scoped imports (`@scope`) to `/` paths for browser resolution.

**Transpilation details** (from `src/transpile.mjs`):
- **Line 3:** Maintains a cache: `const tsmap = new Map();`
- **Lines 5-16:** Caches transpiled output per URL
- **Line 11:** Uses `tsBlankSpace(source)` to strip types (from ts-blank-space package)
- No transformation of import paths — only type stripping

### Flow for clientModules

1. SSG build writes clientModules paths verbatim into HTML `<script type="module">` tag
2. Browser fetches the module (e.g., `/demo/hydration/client.ts`)
3. Dev server's `tsFileServer` middleware intercepts `.ts` requests
4. ts-blank-space transpiles on the fly; import specifiers remain unchanged
5. Browser imports further modules using the same flow

**No bundling occurs.** Each import is resolved as a separate HTTP request through the dev server's transpilation layer.

---

## 3. FILESYSTEM ADAPTERS

### FileSystemAdapter Interface

**File:** `/Users/david.souther/devel/jefri/jiffies/src/fs.ts:69-78`

```typescript
export interface FileSystemAdapter {
  stat(path: PathLike): Promise<Stats>;
  readdir(path: PathLike): Promise<string[]>;
  scandir(path: PathLike): Promise<Stats[]>;
  mkdir(path: PathLike): Promise<void>;
  copyFile(from: PathLike, to: PathLike): Promise<void>;
  readFile(path: PathLike): Promise<string>;
  writeFile(path: PathLike, contents: string): Promise<void>;
  rm(path: PathLike): Promise<void>;
}
```

### FileSystemAdapter Implementations

**1. RecordFileSystemAdapter** (in-memory)

**File:** `/Users/david.souther/devel/jefri/jiffies/src/fs.ts:145-253`

- Backing store: `Record<string, string>` (lines 146-148)
- Methods: `stat`, `readdir`, `scandir`, `mkdir`, `copyFile`, `readFile`, `writeFile`, `rm`
- **mkdir is a no-op** (lines 217-219):
  ```typescript
  mkdir(_path: string): Promise<void> {
    return Promise.resolve();
  }
  ```

**2. LocalStorageFileSystemAdapter**

**File:** `/Users/david.souther/devel/jefri/jiffies/src/fs.ts:255-259`

- Wrapper around `RecordFileSystemAdapter` backed by `window.localStorage`
- Inherits all methods from parent

**3. ObjectFileSystemAdapter**

**File:** `/Users/david.souther/devel/jefri/jiffies/src/fs.ts:262-266`

- Converts nested object structure to flattened path record
- Inherits all methods from `RecordFileSystemAdapter`

**4. NodeFileSystemAdapter** (real Node.js fs)

**File:** `/Users/david.souther/devel/jefri/jiffies/src/fs_node.ts:21-57`

- Uses Node.js `node:fs/promises` functions (lines 1-9)
- **Full method implementations:**
  - `stat(path)` (lines 22-33): Maps node Dirent to jiffies Stats
  - `readdir(path)` (lines 34-36): Direct delegation to fs.readdir
  - `mkdir(path)` (lines 37-39): Direct delegation to fs.mkdir
  - `scandir(path)` (lines 40-44): Maps readdir results to full Stats via stat calls
  - `copyFile(from, to)` (lines 45-46): Direct delegation to fs.copyFile
  - `readFile(path)` (lines 48-50): Returns utf-8 string
  - `writeFile(path, contents)` (lines 51-53): Writes utf-8 string
  - `rm(path)` (lines 54-56): Removes with `{ force: true, recursive: true }`

### mkdir and Parent Directory Creation

**Critical observation:** The `build()` function at `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:114` calls:

```typescript
await fs.writeFile(path, html);
```

**without calling `mkdir` first.**

- **RecordFileSystemAdapter:** `mkdir` is a no-op (line 218), and `writeFile` directly sets the path in the record (lines 240-245). **Parent directories are not created.**
- **NodeFileSystemAdapter:** `mkdir` calls `node:fs/promises.mkdir(path)` (line 38) **without recursive option**, so parent directories are NOT created. The `writeFile` call will **fail** if parent directories do not exist on disk.

**Implication:** A real-world CLI using `NodeFileSystemAdapter` would need to:
- Call `fs.mkdir(path, { recursive: true })` before writeFile, OR
- Pre-create the output directory structure, OR
- The build caller must ensure the output directory exists

**Test evidence:** `/Users/david.souther/devel/jefri/jiffies/src/fs.test.ts:19-25` shows "Writes deep files" test expects paths like `/deep/hello` to be written directly without explicit mkdir calls (works only with RecordFileSystemAdapter).

---

## 4. EXISTING CLI PATTERNS

### src/server/main.ts Structure

**File:** `/Users/david.souther/devel/jefri/jiffies/src/server/main.ts`

**Shebang and Module:**
- Line 1: `#!/usr/bin/env node` — makes the script executable directly
- Line 1: `import * as process from "node:process";` — explicit process import (line 2)

**Argument Parsing:**
- **Lines 8, 15-20:** Uses `node:util.parseArgs()` from Node.js std lib
  ```typescript
  const { values } = parseArgs({
    options: {
      port: { type: "string", default: "8080" },
      host: { type: "string", default: "0.0.0.0" },
    },
  });
  ```
- **Behavior:** Throws on unknown flags (parseArgs defaults to `strict: true`), causing non-zero exit before any listening state is reached
- **Flag structure:** `--port <value>` and `--host <value>` (string types with defaults)

**Logging:**
- **Line 4:** `import { info } from "../log.ts";`
- **Line 6:** `info("Starting server", { cwd: process.cwd() });`

**Async Main Pattern:**
- **Lines 25-30:** `async function main()` that:
  - Creates HTTP server with `makeServer()` (line 26)
  - Calls `server.listen(port, host)` (line 27)
  - No error handling; assumes success

### Log.ts Exports and Behavior

**File:** `/Users/david.souther/devel/jefri/jiffies/src/log.ts`

**Exported functions:**
- `debug(message: Display, data?: object)` (lines 137-140)
- `info(message: Display, data?: object)` (lines 142-145)
- `warn(message: Display, data?: object)` (lines 147-150)
- `error(message: Display, data?: object)` (lines 152-155)

**Output destinations:**
- **Lines 126-129:** Logger methods use `logger.console[method](logLine)`:
  - `debug` → `console.debug()`
  - `info` → `console.info()`
  - `warn` → `console.warn()`
  - `error` → `console.error()`
- **Default console:** `global.console` (line 125)

**Formatting:**
- **Lines 109-116:** Messages are formatted via `logger.format()` (default `JSON.stringify`)
- **Lines 54-62:** Built-in `basicLogFormatter(data)` returns simple string: `"${data.prefix}: ${data.message}"`
- **Data available:** `{ name, prefix, level, message, source: findSource() }`

**Levels:**
- LEVEL.DEBUG (1), LEVEL.INFO (2), LEVEL.WARN (3), LEVEL.ERROR (4), LEVEL.SILENT (5)
- Messages are logged only if level >= logger.level

**Note:** `info/warn/error` write to `stdout` (via `console.info/warn/error` which default to stdout), while precise stderr routing depends on Node.js console implementation. By default in Node.js:
- `console.log/info` → stdout
- `console.warn/error` → stderr

---

## 5. DEMO USAGE EXAMPLE: `demo/hydration/`

### Page Module Structure

**File:** `/Users/david.souther/devel/jefri/jiffies/demo/hydration/page.ts:128-135`

```typescript
const module: PageModule = {
  default: () => pageBody(new Date().toISOString()),
  head: () => pageHead(),
  lang: "en",
  clientModules: ["/demo/hydration/client.ts"],
};

export default module;
```

**default function (lines 35-116):** Returns an array of Node elements:
- `header`, `main`, and other DOM nodes created via helper functions (`h1`, `p`, `section`, etc.)
- These are imported from `src/dom/html.ts` (line 19)
- Structured to demonstrate hydration scenarios (ClickCounter, LikeButton custom elements)

**head function (lines 23-33):** Returns metadata and links:
- `<meta charset>`, viewport, title, CSS link to pico.css

**lang property (line 131):** Set to `"en"` (string literal)

**clientModules property (line 132):** Single-element array:
- `["/demo/hydration/client.ts"]` — the absolute path to the client entry module

### Client Module: client.ts

**File:** `/Users/david.souther/devel/jefri/jiffies/demo/hydration/client.ts`

```typescript
import "./components.ts";
import { start } from "../../src/dom/hydrate.ts";

start();
```

**Behavior:**
- Line 6: Imports `./components.ts` as a side effect (registers custom elements via FC declarations)
- Line 7: Imports `start()` function from hydrate.ts
- Line 9: Calls `start()` to scan document and adopt server-rendered custom elements

**Component Integration:** `components.ts` defines two custom elements:
- `ClickCounter` (with M3 state payload support)
- `LikeButton` (simple toggle)

Both are created with `FC<Props, State>(tagName, renderFn)` and registered globally when the module loads.

### Server.ts Demo Integration

**File:** `/Users/david.souther/devel/jefri/jiffies/demo/hydration/server.ts`

**Note:** Line 20 has an **incorrect import path**:
```typescript
import { build } from "../../src/dom/ssg.ts";  // Should be "../../src/ssg/ssg.ts"
```

The correct path is `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts`.

**Correct SSG invocation (lines 42-46):**
```typescript
await build({
  pages: [{ route: "/", module: pageModule }],
  out: "",
  fs: new FileSystem(new RecordFileSystemAdapter(files)),
});
```

**Output retrieval (line 48):**
```typescript
const INDEX_HTML = files["/index.html"] ?? "<h1>Build failed</h1>";
```

The HTML is captured from the RecordFileSystemAdapter's backing store and served at `/` (lines 53-59).

---

## Sources

- `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:6-11` — PageModule interface
- `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:14-17` — PageDescriptor interface
- `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:20-24` — BuildOptions interface
- `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:70-116` — build() function
- `/Users/david.souther/devel/jefri/jiffies/src/ssg/ssg.ts:104-107` — clientModules script injection
- `/Users/david.souther/devel/jefri/jiffies/src/dom/hydrate.ts:10-44` — captureStubSource constant
- `/Users/david.souther/devel/jefri/jiffies/src/dom/render.ts:10-30` — renderToString() function
- `/Users/david.souther/devel/jefri/jiffies/src/fs.ts:69-78` — FileSystemAdapter interface
- `/Users/david.souther/devel/jefri/jiffies/src/fs.ts:145-253` — RecordFileSystemAdapter
- `/Users/david.souther/devel/jefri/jiffies/src/fs_node.ts:21-57` — NodeFileSystemAdapter
- `/Users/david.souther/devel/jefri/jiffies/src/server/main.ts:1-30` — Server CLI structure
- `/Users/david.souther/devel/jefri/jiffies/src/log.ts:137-155` — Log function exports
- `/Users/david.souther/devel/jefri/jiffies/src/server/http/typescript.ts:18-46` — TypeScript transpilation
- `/Users/david.souther/devel/jefri/jiffies/src/transpile.mjs:1-16` — ts-blank-space transpiler
- `/Users/david.souther/devel/jefri/jiffies/demo/hydration/page.ts:128-135` — PageModule export
- `/Users/david.souther/devel/jefri/jiffies/demo/hydration/client.ts:1-10` — Client entry
- `/Users/david.souther/devel/jefri/jiffies/package.json:37` — ts-blank-space dependency
- `/Users/david.souther/devel/jefri/jiffies/src/fs.test.ts:19-25` — Deep file write test
