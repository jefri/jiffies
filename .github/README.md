# GitHub workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | Pull request; manual | Runs lint and tests (`npm run all`). |
| `release.yml` | 04:44 UTC; manual | Publishes `@davidsouther/jiffies` to npm when shipped files changed. |

## release.yml

Runs `node scripts/stamp.ts --if-changed`, the same tool as `npm run stamp`. It:

1. Skips the release if no commits touched `src`, `LICENSE`, or `README.md` since the latest `v*` tag. A version bump touches only `package.json`, so it never triggers another release.
2. Computes a calver version `YYYY.ISO_WEEK.MICRO` (see `scripts/stamp.ts`), writes it to `package.json`, and commits `chore(release): <version>`.
3. Tags `v<version>` and pushes the commit and tag to `main` as `github-actions[bot]`.
4. Runs `npm publish --access public`, which builds `lib/` through `prepublishOnly`.

Pushing to `main` needs branch protection to allow the Actions bot. Preview with `node scripts/stamp.ts --dry-run --if-changed`.

### Publishing without a token

The workflow has no npm token. The job's `id-token: write` permission lets npm verify that `release.yml` in this repository is the publisher with Trusted Publishing, and attaches provenance automatically.

One-time setup, after this workflow is on `main` (needs npm 11.15 or newer and 2FA). `scripts/npm-trust.ts` logs in if needed (approve with your passkey), skips the step if `release.yml` is already trusted, runs `npm trust github`, and triggers `release.yml`:

```sh
npm run setup-npm-trust
```

The `repository` field in `package.json` must match the GitHub repository exactly, or publishing fails with `ENEEDAUTH`. A new trust configuration expires unless it completes a first publish within 2 days; the script triggers the first run for you.
