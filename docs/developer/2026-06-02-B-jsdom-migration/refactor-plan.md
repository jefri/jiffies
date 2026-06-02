# Refactor Plan — jsdom migration

- [x] `src/dom/html.test.ts:70` **Unnecessary cast** — `(btn as unknown as HTMLButtonElement)` is redundant; `button()` already returns `HTMLButtonElement`. Remove the cast.
- [x] `src/dom/dom.ts:11` **Non-obvious global override** — `global.Event = window.Event` unconditionally overwrites Node's native `Event`. The WHY (jsdom's `dispatchEvent` instanceof-checks its own Event class) is invisible. Add a one-line comment.
