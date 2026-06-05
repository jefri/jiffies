# Task Notes: Hydration M2 — `hydrateRoot`

Design source: `docs/developer/2026-06-04-B-hydration/design.md` (git history;
latest commit on that folder: `09a988e`).

## Goal

`hydrateRoot(mount, render)` re-runs `render`, reconciles the resulting tree
ONCE into `mount` (the live server-DOM root), grafting handlers onto kept nodes
via `patchNode`. No flash; the server shell is never detached.

## Key design constraints

- Every custom element (an FC unit) is an **opaque leaf** in the reconcile: keep
  the element node by identity / positional same-tag but do NOT recurse into its
  children. Those subtrees are owned by each FC's own `start()`-triggered adopt.
  Recursing in would fight each FC's self-rebuild over the same children.
- `defer-hydration` ordering: the serializer emits `defer-hydration` on nested
  custom elements; the enclosing unit removes it after adopting, so parents
  hydrate before children regardless of upgrade order.
- Plain-DOM handlers grafted in this path are subject to design constraint #4:
  handlers must act through `event.target`/`el`, not captured fresh siblings
  (the reconcile discards fresh nodes while keeping mounted ones).

## Implementation sketch

1. Add a `reconcileHydrateRoot(mount, children)` variant (or an option flag on
   `reconcileChildren`) that treats `nodeName` matching for custom elements as
   identity-only — recurse into the `patchNode` path for plain elements, but
   skip recursion for custom-element matched nodes.
2. Replace `hydrateRoot`'s `throw` body with: call `render()`, call
   `reconcileHydrateRoot(mount, Array.from(result))`, then call
   `start(mount)` to trigger the FC adopt pass for the custom elements the
   reconcile kept.
3. Handle `defer-hydration`: emit the attribute in `renderToString` on nested
   custom elements; in `start()`, strip it from each unit before calling
   `el.update()`.

## Feature test spec (from design.md Verification M2)

- `hydrateRoot` reconciles without detaching the shell: assert node identity
  of a focused input survives across the call.
- The reconcile stops at custom-element boundaries: a nested FC's server child
  is NOT overwritten by the outer `hydrateRoot` pass.
- `defer-hydration` enforces parent-before-child ordering.

## Session folder

Start a new session under `docs/developer/` (e.g.
`2026-06-05-A-hydration-m2/`) for the M2 feature-test → plan → implement
cycle.
