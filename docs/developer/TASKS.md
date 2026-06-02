# Node Modernization Tasks


- **Dead namespace branch in `update`.**
  - > Latent defects in the reentrant `update` path, found while documenting the DOM for consumers.
    > Documentation (`src/dom/SKILL.md`) describes current behavior; these tasks fix it.
  - Red: a test creating a namespaced element (or SVG) and asserting the intended
    `setAttributeNS` path; today it is unreachable because `useNamespace` is hardcoded
    `false` and the assigning expression is computed and discarded (`dom.ts:148-152`).
  - Green/decision: either wire `useNamespace` to the intended expression, or delete the
    dead branch if `setAttribute` is sufficient for SVG. Decide with a test that pins the
    SVG attribute behavior either way.
  - Note: confirm whether any current SVG usage depends on namespaced attributes before
    choosing. Do not skip the check.


- **Update `src/dom/SKILL.md`**
  - > Latent defects in the reentrant `update` path, found while documenting the DOM for consumers.
    > Documentation (`src/dom/SKILL.md`) describes current behavior; these tasks fix it.