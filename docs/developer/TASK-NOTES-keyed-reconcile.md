# TASK-NOTES: Keyed reconcile + `keyed` no-allocation helper

Deferred scope extracted from the FC-render design (`2026-06-04-A-fc-render`,
removed at cleanup; recoverable in git history at commit `7329579`).

## What already shipped (FC-render)

The **keyless automatic path** in `src/dom/dom.ts`:

- `reconcileChildren` does two-pass matching — identity (`===`) first, then
  positional same-tag patch-reuse of a genuinely-fresh element against the next
  unclaimed mounted element of the same `nodeName`.
- `patchNode(kept, fresh)` patches a kept node from a freshly-built spec node:
  attribute add/update/remove diff, listener replace-not-stack, then recurses
  `reconcileChildren` into children (nested identity preserved at any depth).

This satisfies design metrics 1 (identity survives a re-render), 3 (linear
cost), and 5 (no listener leak). Policy survey: `docs/research/
2026-06-04-A-reconcile-keyless-policy/public.md`.

## What remains deferred

The **keyed layer** and the **no-allocation primitive** — each its own
feature-test → plan → rgr cycle.

### 1. Unified per-parent key cache
`parent[Cache]: Map<Key, Node>` as the source of truth for keyed identity. Not
FC-specific — lives on any element whose children are reconciled.

### 2. Key resolution in `update()`
Priority: `attrs[KEY]` (new exported `KEY` symbol) → `attrs.key` (string) →
`attrs.id` (stays a real attribute) → positional index (tag + sibling index).
After resolving, delete `[KEY]`/`key` from attrs before the `setAttribute` loop
(identity metadata, not DOM attributes; `id` left intact) and store
`node[KEY] = resolvedKey`. Public surface: one new exported `KEY` symbol plus the
documented `key`/`id` fallbacks.

### 3. Keyed matching in `reconcileChildren`
- Keyed children match by `parent[Cache].get(key)` at *any* prior position; a
  moved keyed node is reused and repositioned with `insertBefore`, never rebuilt
  (the reorder-churn win, metric 4 — needs a reorder test).
- Keyless refinements on the positional cursor: if the candidate carries a stored
  `node[KEY]` and the fresh child declares a *disagreeing* key, do not reuse (new
  node); if the candidate carries a stored key and the fresh child declares *no*
  key, treat as the same node.
- Evict the cache entry when a kept node is removed.

### 4. `keyed(parent, key, factory)` no-allocation helper
First call per key runs `factory()`, sets `node[KEY]`, caches, returns it.
Subsequent calls return the cached node — `factory()` never re-runs; the author
mutates via the node's own `.update(...)`. Cache hit by identity skips the patch.

### 5. Branchy renders
`inline_edit.ts` returns `view()` *or* `edit()` at the same position. Under the
default positional key both resolve to "span at index 0," so the automatic path
would patch view→edit instead of swapping. Authors give the branches distinct
explicit keys (`"view"`/`"edit"`) so a mode change replaces the node, focus
landing on a genuinely new input. Canonical case for explicit keys.

### 6. Custom-element lifecycle on keyed reorder
Moving a custom element via `insertBefore` fires disconnect/reconnect.
Stationary reuse is safe (never detached). Moved custom elements may need
treatment alongside the reorder-churn concern. Originates from the pre-existing
deferred task: `reconcileChildren` moves a reused child that changes position via
`insertBefore`, detaching-then-inserting it and firing connect/disconnect on a
custom element.

### 7. Adoption (design metric 2 — automatic path needs no render-fn changes)
- `src/components/inline_edit.ts:36-48` — `view()` returns a fresh `span`; on
  click `el.update(render())` rebuilds it, detaching caret/selection.
- `src/components/virtual_scroll.ts:173-186` — every scroll rebuilds all visible
  row `div`s fresh, detaching unchanged rows.

### Open design questions (for the planning phase)
- The exact keyed-vs-keyless matching algorithm that keeps total cost O(n) while
  supporting cross-position keyed lookup and positional keyless cursoring in one
  pass.
- Whether `keyed` reads an ambient parent (so render need not pass `el`) or keeps
  the explicit `parent` argument.
