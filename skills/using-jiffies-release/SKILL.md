---

name: using-jiffies-release
description: Use when a project that depends on @davidsouther/jiffies must cut CalVer npm releases, publish with npm Trusted Publishing (no token), or schedule a nightly release workflow, for one package or an npm-workspaces monorepo, instead of writing release scripts, semantic-release, changesets, or an NPM_TOKEN rotation.
---

# Using Jiffies Release

## Overview

`jiffies-release` cuts `YYYY.ISO_WEEK.MICRO` releases (for example `2026.46.0`) and publishes them with npm Trusted Publishing, so CI needs no npm token. It is the same tool Jiffies releases itself with. It runs through `sh.ts`, so it never goes through a shell.

```sh
npm install -D @davidsouther/jiffies
npx jiffies-release stamp --dry-run   # preview every step, change nothing
npx jiffies-release stamp             # bump, commit (when `commit` is on), tag, push, publish
npx jiffies-release trust             # one-time Trusted Publishing setup
```

Do not write a per-repo release script, calver helper, or token-rotation job. Do not add an `NPM_TOKEN` secret. GitHub announced that 2FA-bypass tokens lose the ability to publish directly, expected around January 2027 (see the 2026-07-08 [GitHub changelog](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)), and a stage-only token holds each release for a manual 2FA approval.

## Packages

It releases the public packages of the repository root:

- If the root `package.json` has `workspaces` (a literal directory, or `dir/*`), each non-private workspace is a package.
- Otherwise the root package is the only package.

Configure a package with a `release` key in its own `package.json`:

```json
{ "release": { "shipped": ["src", "LICENSE", "README.md"], "commit": true } }
```

| Key       | Meaning                                                                                                                                                                                                                             | Default                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `shipped` | Paths whose changes warrant a release (used by `--if-changed`)                                                                                                                                                                      | The package directory                                |
| `commit`  | Commit the version bump as `chore(release): <version>`. When `false`, the bump is still written to `package.json` for publishing but left uncommitted, so the tag marks the released commit and the working tree is dirty afterward | `true` for the root package, `false` for a workspace |

Tags are annotated: `v<version>` for the root package, `<dir>-v<version>` for a workspace (`libs/b` becomes `libs-b-v...`). The next version continues from the highest tag and `package.json` version in the same ISO week, and restarts at `0` in a new week.

Set `"repository"` in each `package.json` to the GitHub repository URL. Trusted Publishing matches it exactly.

## stamp

| Flag           | Effect                                                                                                                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--dry-run`    | Print each step; write, commit, tag, push, and publish nothing (`npm publish --dry-run` still validates the tarball)                                                                                                 |
| `--if-changed` | Skip a package whose shipped paths have no commits since its last tag. A package with no tag yet is always released. The release tag lands on the bump commit, so a bump never counts as a change since the last tag |

A live run needs a clean working tree and, outside GitHub Actions, an `npm login` session. A dry run only warns.

## Nightly workflow

```yaml
name: release
on:
  schedule:
    - cron: "44 4 * * *" # off the hour: GitHub delays and drops runs at :00
  workflow_dispatch:
permissions:
  contents: write
  id-token: write # npm Trusted Publishing (OIDC)
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { ref: main, fetch-depth: 0 }
      - uses: actions/setup-node@v7
        with: { node-version: 24, registry-url: "https://registry.npmjs.org" }
      - run: npm ci
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
      - run: npx jiffies-release stamp --if-changed
```

Do not set `NODE_AUTH_TOKEN`. Pushing to `main` needs branch protection to allow the Actions bot when `commit` is on.

## trust (one time, after the workflow is on main)

```sh
npx jiffies-release trust
```

It needs npm 11.15 or newer and an interactive npm session with 2FA (passkey); `npm trust` rejects bypass-2FA tokens. For each public package it: logs in if needed, publishes the package as checked out, at its current `package.json` version, if the name does not exist yet (npm can only trust an existing package), runs `npm trust github <pkg> --file release.yml --repo <owner/repo> --allow-publish`, skips a package that already trusts that exact workflow file, then triggers the workflow. A new trust configuration expires unless it completes a first publish within 2 days, which is why it triggers the run. Options: `--workflow` (default `release.yml`), `--ref` (default `main`), and `--repo` (default: the `origin` remote). The npm requirements here come from the npm docs for [trusted publishers](https://docs.npmjs.com/trusted-publishers) and [`npm trust`](https://docs.npmjs.com/cli/v12/commands/npm-trust), and may change.

## From code

`@davidsouther/jiffies/calver.ts` (`isoWeek`, `nextVersion`, `compareVersions`), `release.ts` (`release`, `discoverPackages`, `tagPrefix`), and `npm_trust.ts` (`setupTrust`, `trustArgs`, `repoFromRemote`). Tests inject a fake `runner` and an in-memory `FileSystem`; see `src/release.test.ts`.

```ts
import { release } from "@davidsouther/jiffies/release.ts";
import { NodeFileSystem } from "@davidsouther/jiffies/fs_node.ts";

const tags = await release({
  fs: new NodeFileSystem(),
  root: process.cwd(),
  dryRun: true,
});
```
