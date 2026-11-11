# Development

## Setup

Jiffies requires Node 22.18 or newer, which runs TypeScript directly through type stripping. CI uses Node 24.

```sh
git clone https://github.com/jefri/jiffies.git
cd jiffies
npm install
```

To use a local checkout from another project, run `npm link` here, then `npm link @davidsouther/jiffies` in that project. Run `npm run build` after edits so `lib/` reflects them.

## Layout

- `src/` holds library source. Tests sit beside source as `*.test.ts`.
- `test/` holds feature tests and fixtures that do not belong to one module.
- `demo/` holds a hydration example app.
- `skills/` holds agent skills that document how to use Jiffies in other projects.
- `lib/` is build output and is not committed.

## Language rules

Source is TypeScript that must run unbuilt under Node, so `tsconfig.json` enables `erasableSyntaxOnly`. Avoid enums, namespaces, and parameter properties. Import local files with their `.ts` extension.

Published subpaths follow the export map `./*.ts`, for example `@davidsouther/jiffies/dom/html.ts`.

## Commands

| Command                | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `npm test`             | Run all tests with the Node test runner             |
| `npm run build`        | Emit declarations and JavaScript to `lib/esm`       |
| `npm run format`       | Format files in place with Biome                    |
| `npm run check:format` | Verify formatting without writing                   |
| `npm run check:lint`   | Run Biome lint and format checks                    |
| `npm run fix`          | Apply Biome fixes, including unsafe                 |
| `npm run all`          | Lint, then test. CI runs this on every pull request |
| `npm start`            | Start the Node HTTP server in `src/server/main.ts`  |

Run `npm run all` before opening a pull request.

## Formatting

This repository uses [Biome](https://biomejs.dev) for formatting and linting. Do not use Prettier or other formatters. Configuration lives in `biome.json`: two space indentation, double quotes, and organized imports.

Run `npm run format` before committing, including for Markdown and skill files.

## Testing

Tests use the built in Node test runner (`node:test`) with `node:assert/strict`. DOM tests run under Node, and jsdom loads automatically when `window` is undefined.

Run one file with `node --test src/dom/html.test.ts`.

## Releases

Releases are automated and use CalVer (`YYYY.WW.N`). A nightly workflow, `.github/workflows/release.yml`, runs `npm run all` on `main`, then `jiffies-release stamp --if-changed`. That command bumps the version, tags, pushes, and publishes to npm with Trusted Publishing over OIDC, so no token is stored. It does nothing when shipped files are unchanged.

Do not bump `version` or edit `CHANGELOG.md` by hand. Release setup is documented in `skills/using-jiffies-release/SKILL.md`.

## Skills

Skills under `skills/` are written for agents working in projects that depend on Jiffies. Update a skill in the same pull request as a behavior change it describes. Check examples against `*.test.ts` files before documenting them.
