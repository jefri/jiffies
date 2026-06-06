# Refactoring Plan: SSG Build CLI

## Smells

- [x] `bundle.ts:36-39` **Dead Code** — if/else both produce `join(rootDir, spec)`; collapse to a single expression.
- [x] `main.ts:76-78,89-91` **Duplicated Code** — route→htmlPath construction appears twice; extract `htmlPathForRoute(route, outDir)`.
- [x] `discover.ts:37-45` **Uncommunicative Name** — `seen` map stores `route → route`; error message can't name the colliding files. Store the sentinel path instead.
