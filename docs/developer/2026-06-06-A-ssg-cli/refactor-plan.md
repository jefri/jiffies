# Refactoring Plan: SSG Build CLI

## Smells

- [x] `bundle.ts:36-39` **Dead Code** — if/else both produce `join(rootDir, spec)`; collapse to a single expression.
- [x] `main.ts:76-78,89-91` **Duplicated Code** — route→htmlPath construction appears twice; extract `htmlPathForRoute(route, outDir)`.
- [x] `discover.ts:37-45` **Uncommunicative Name** — `seen` map stores `route → route`; error message can't name the colliding files. Store the sentinel path instead.

## Smells (2026-06-07, lang-override loop)

- [x] `src/dom/render.test.ts:103-198` **Misplaced Test / Inappropriate Intimacy** — a `dom/` test imports `build` from `../ssg/ssg.ts` and retests the SSG pipeline; root-page, nested-page, and lang-override cases duplicate `src/ssg/ssg.test.ts`. Migrate the two unique cases (async default export, async head export) into `ssg.test.ts`, then delete the build block and now-dead imports (`build`, `FileSystem`, `RecordFileSystemAdapter`, `h1`) from `render.test.ts`.
