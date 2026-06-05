# Refactor Plan — M1 Hydration Surface

Files in scope: `src/dom/hydrate.ts`, `src/dom/dom.ts` (`update()` and neighbors).
Baseline: tests green, `tsc --noEmit` clean.

---

- [x] **Comments** — `hydrate.ts:1-21` Stale module JSDoc still describes the file as a
  "contract stub" with "no hydration behavior lives here yet." M1 is shipped; the
  description should reflect what is actually there. Replace with a concise module
  description of the two exported functions.

- [x] **Unnecessary allocation** — `hydrate.ts:37` `Array.from(el.children)` inside the
  `while` loop allocates a temporary array on every non-FC element just to iterate.
  `HTMLCollection` is iterable; `for (const child of el.children)` works directly.
  Same at line 31 (`Array.from(root.children)` → spread into the initial stack).

- [x] **Unnecessary cast** — `hydrate.ts:63` `(el as { update(): void }).update()` is a
  structural cast added when the function was first drafted. `dom.ts` augments the
  global `Element` interface with `update`, so the cast is not needed — `el.update()`
  is valid. Removing it makes the call site match how every other call site invokes
  `update()`.

- [x] **Magic variable** — `dom.ts:182` `const remove = !v; if (remove)` — the
  intermediate boolean adds no clarity; `if (!v)` is direct.
