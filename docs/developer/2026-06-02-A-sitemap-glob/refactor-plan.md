# Refactor Plan — sitemap-glob

- [x] `src/server/http/sitemap.ts:12` **Redundant type annotation** — `(name: string)` is redundant because `withFileTypes: false` already narrows the `exclude` callback parameter to `string`. Remove the annotation.
- [x] `src/server/http/sitemap.test.ts:16-21` **Dead payload in fixture** — each fixture entry is a `[path, content]` tuple but `content` is always `""` and never used. Simplify to a plain `string[]` of paths.
