# SSG Build CLI — Feature Test

## User Story

A developer has a project directory containing a `pages/` tree of `page.ts` sentinels, a `public/` directory of static assets, and at least one page that lists client-side TypeScript modules. They run:

```
node src/ssg/main.ts build --root <project>
```

The CLI exits 0 and writes a `dist/` directory containing:

- One `index.html` per discovered page at the route derived from its folder path.
- Nested routes in nested subdirectories (recursive `mkdir` guaranteed).
- Group folders like `(blog)` stripped from all route paths.
- Static assets from `public/` copied verbatim.
- Hashed `.js` bundles under `dist/assets/` for every page that declares `clientModules`.
- No `.ts` import specifiers anywhere in the emitted HTML.

Running the CLI against an empty directory exits 1. Passing an unknown flag exits 1.
With `--json`, the build manifest is written to stdout as valid JSON and stdout is otherwise empty.

## Test File

[test/feature/ssg-build-cli.test.sh](../../../test/feature/ssg-build-cli.test.sh)

Fixture project: [test/fixtures/ssg-cli/](../../../test/fixtures/ssg-cli/)

### Fixture layout

```
pages/
  page.ts               →  /               →  dist/index.html
  about/page.ts         →  /about          →  dist/about/index.html
  (blog)/post/page.ts   →  /post           →  dist/post/index.html
  app/page.ts           →  /app            →  dist/app/index.html  (clientModules)
public/
  style.css             →  dist/style.css  (verbatim copy)
client.ts               (bundled entry referenced by app/page.ts)
```

### Assertions

| # | Description |
|---|---|
| 1 | `dist/index.html` exists and contains `<h1>Home</h1>` |
| 2 | `dist/about/index.html` exists (nested route / recursive mkdir) |
| 3 | `dist/post/index.html` exists; `dist/(blog)/` does NOT exist (group strip) |
| 4 | `dist/style.css` exists (public passthrough) |
| 5 | `dist/app/index.html` exists with no `.ts"` specifier (bundler rewrite) |
| 6 | `dist/assets/*.js` exists (Rollup bundle produced) |
| 7 | CLI exits non-zero when `pages/` is absent |
| 8 | CLI exits non-zero on an unknown flag |
| 9 | `--json` emits valid JSON to stdout; normal mode produces no stdout |
