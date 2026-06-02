# Refactor Plan — event-handler-stacking

- [x] **Dead Code** `src/dom/dom.ts:101` — remove the commented-out destructuring line that was never enabled.
- [x] **Map stale entry** `src/dom/dom.ts:106-110` — when `v === null`, the listener is removed from the DOM but `$events.delete(k)` is never called. The Map retains a stale reference to the removed handler.
