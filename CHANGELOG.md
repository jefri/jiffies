# Changelog

Versions follow a `year.week.release` scheme (e.g. `2026.4.1`).

## Unreleased

### Removed

- **Breaking:** removed the `flags` module and its published entry point
  `@davidsouther/jiffies/flags.ts`. The hand-rolled flag scanner is replaced by
  the native [`node:util` `parseArgs`][parseargs] API. Callers that imported
  `parse` from `@davidsouther/jiffies/flags.ts` should call `parseArgs` directly
  with a declared option schema. `parseArgs` defaults to `strict: true`, so
  unknown flags now fail fast instead of being silently ignored.

[parseargs]: https://nodejs.org/api/util.html#utilparseargsconfig
