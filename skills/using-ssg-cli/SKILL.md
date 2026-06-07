---
name: using-ssg-cli
description: Use when setting up a new project to build a static site with @davidsouther/jiffies SSG CLI — configuring npm dependencies, page structure, TypeScript type-checking without emit, and GitHub Actions CI.
---

# Using SSG CLI

## Overview

`@davidsouther/jiffies` ships an SSG (Static Site Generator) CLI that discovers TypeScript page modules, renders them to HTML, bundles client-side code via Rollup, copies static assets, and reports file sizes. It follows Next.js App Router conventions for filesystem-based routing.

## Quick Reference

| Task | Command |
|------|---------|
| Build site | `node src/ssg/main.ts build` |
| Build with size budget | `node src/ssg/main.ts build --max-size 50000` |
| Build to custom dir | `node src/ssg/main.ts build --out dist` |
| Type-check without emit | `tsc --noEmit` |
| Keep existing output | `node src/ssg/main.ts build --no-clean` |
| Emit JSON manifest | `node src/ssg/main.ts build --json` |

## Project Setup

### package.json

```json
{
  "type": "module",
  "scripts": {
    "build": "node src/ssg/main.ts build",
    "build:check": "node src/ssg/main.ts build --max-size 50000",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@davidsouther/jiffies": "latest"
  },
  "devDependencies": {
    "@types/node": "^22.0.0"
  }
}
```

### tsconfig.json

For type-checking without emitting JavaScript (required when using `ts-blank-space` / native TS execution):

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "incremental": true,
    "skipLibCheck": true
  },
  "include": ["src", "pages"]
}
```

`noEmit` makes `tsc` a type-checker only. `allowImportingTsExtensions` allows `.ts` extensions in import paths (required when using native TypeScript execution without a bundler step for source). `erasableSyntaxOnly` prevents use of TypeScript constructs that cannot be stripped by ts-blank-space (enums, namespaces, parameter properties).

## Directory Structure

```
project-root/
├── pages/
│   ├── page.ts               # / route
│   ├── about/page.ts         # /about route
│   ├── blog/[slug]/page.ts   # dynamic route (needs generateStaticParams)
│   └── (marketing)/page.ts   # group folder — stripped from URL → /
├── public/                   # copied verbatim to dist/
│   ├── style.css
│   └── favicon.ico
├── ssg.config.ts             # optional config override
└── dist/                     # output (created by build)
```

## Page Module Contract

Each `page.ts` must export a default object conforming to `PageModule`. Use `satisfies` to enforce the type when defining the page:

```typescript
import { h1, p, title } from "@davidsouther/jiffies/dom/html.ts";
import type { PageModule } from "@davidsouther/jiffies/ssg/ssg.ts";

export default {
  // Required: returns DOM nodes for <body>
  default: () => [h1("Hello"), p("World")],

  // Optional: returns DOM nodes for <head>
  head: () => title("My Page"),

  // Optional: attributes on <html>; lang defaults to "en"
  // Allowed keys: lang, dir, class, data-*
  htmlAttributes: { lang: "en-UK", "data-theme": "ocean" },

  // Optional: import specifiers bundled by Rollup into /assets/
  clientModules: ["/client.ts"],
} satisfies PageModule;
```

For dynamic routes (`[slug]`), add `generateStaticParams`:

```typescript
export const generateStaticParams = async () => [
  { slug: "first-post" },
  { slug: "second-post" },
];
```

## Optional Config File

```typescript
// ssg.config.ts
import { defineConfig } from "@davidsouther/jiffies/ssg/main.ts";

export default defineConfig({
  pages: "pages",
  out: "dist",
  public: "public",
  root: ".",
  clean: true,
});
```

## GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build:check
```

`typecheck` runs `tsc --noEmit` to catch type errors without producing output files. `build:check` runs the SSG build with a byte-size budget (`--max-size`); it exits non-zero if any asset exceeds the limit, failing the CI run.

Use `--max-size` to enforce a performance budget in bytes. The build emits a Vite-style size table to stderr on every run regardless:

```
dist/index.html           2.1 kB │ gzip: 0.9 kB
dist/assets/core-a1b2.js  12.4 kB │ gzip: 4.1 kB
✓ built 2 pages, 1 assets in 412ms
```

## Common Mistakes

- Importing with no `.ts` extension when `allowImportingTsExtensions` is not set causes resolver errors.
- Forgetting `"type": "module"` in package.json breaks ESM imports in Node.
- Using TypeScript enums, namespaces, or parameter properties fails at runtime with `ts-blank-space` — use `erasableSyntaxOnly: true` in tsconfig to catch these at type-check time.
- Dynamic routes without `generateStaticParams` produce zero pages for that route silently.
- `--json` emits the manifest to stdout; progress and errors go to stderr. Mixing them up in shell scripts breaks JSON parsing.
