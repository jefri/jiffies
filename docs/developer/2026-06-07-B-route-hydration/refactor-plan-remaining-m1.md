# Refactor Plan: Route Hydration — remaining M1 (auto-bootstrap + interceptor)

Post-green cleanup of the navigation runtime after the Navigation-API-only pivot.
Tests green (165/165), working tree clean before starting.

- [x] ~~**Comments (inaccurate)** — `bootstrap()` doc comment and inline step-2 comment
  still reference the dropped "click/`popstate` fallback".~~ Updated to Navigation-API-only.
- [x] ~~**Duplicated full-load fallback** — `fetchDocument` repeated
  `window.location.assign(url.href); return null` in two branches.~~ Extracted the
  `fullLoad(url)` helper; both branches `return fullLoad(url)`.

## Deferred

- **Duplicated test environment** — `interceptor.test.ts` and `interceptor.unit.test.ts`
  both stand up a real-origin jsdom window, the global assignments, and a
  `window.navigation` stub recording the `navigate` listener. Only 2× today, and the
  two `emitNavigate` helpers differ (one returns the intercept handler, the other a
  claimed boolean); the suites read better self-contained. Revisit if a third
  Navigation-API suite appears (Three-Strikes), e.g. an `interceptor.testenv.ts`.
