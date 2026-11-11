# Changelog

Versions follow a `year.week.release` scheme (e.g. `2026.4.1`).

## Unreleased

### Added

- `jiffies-release`, a CLI (`stamp`, `trust`), and its modules `calver.ts`,
  `release.ts`, and `npm_trust.ts`: CalVer (`year.week.release`) npm releases for a
  package or an npm-workspaces monorepo, published with npm Trusted Publishing.
  Jiffies now releases itself with it (`scripts/stamp.ts` and `scripts/npm-trust.ts`
  are gone). Includes the `using-jiffies-release` skill.

### Fixed

- Release tooling called `npm.whoami.with({ check: false })`, which runs
  `npm whoami with`, so the exit code was never treated as data. It now calls
  `npm.whoami().with(...)`.

### Removed

- **Breaking:** removed the `flags` module and its published entry point
  `@davidsouther/jiffies/flags.ts`. The hand-rolled flag scanner is replaced by
  the native [`node:util` `parseArgs`][parseargs] API. Callers that imported
  `parse` from `@davidsouther/jiffies/flags.ts` should call `parseArgs` directly
  with a declared option schema. `parseArgs` defaults to `strict: true`, so
  unknown flags now fail fast instead of being silently ignored.

[parseargs]: https://nodejs.org/api/util.html#utilparseargsconfig
