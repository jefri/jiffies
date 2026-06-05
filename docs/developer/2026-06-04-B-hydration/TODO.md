# Hydration — Milestone Decomposition

The hydration design (`design.md`) is an ensemble. It builds in sequenced
milestones, each its own feature-test → plan → implement cycle through
`developer:ailly`. Build in order; later milestones depend on earlier ones.

The governing constraint: **no user-facing hydration knobs.** Hydratability is an
automatic side effect of attaching behavior at the single `update()` seam; FC
components register themselves through `customElements.define`. There is no
`register`, `markHydrate`, `Hydrator`, string id, or `data-hydrate-on` selector.
The author surface is `start()` and `hydrateRoot()` only.

- [ ] **M1 — FC adopt-and-hydrate + `load` trigger + auto-marking.**
  `src/dom/hydrate.ts`: `start(root)`, the unit scan (defined custom elements;
  the scan does not descend into a custom element), and the FC adopt path
  (`whenDefined` → adopt the upgraded server element as `el` → run `el.update()`
  → rebuild its subtree). `update()` in `src/dom/dom.ts` stamps a boolean
  `data-hydrate` attribute when an element leaves with a non-empty `[Events]`
  map. Only the `load` trigger. Verified against the `virtual_scroll` closure
  shape (reference-holding idiom updates the *attached* node). Smallest
  end-to-end automatic slice: ship JS after paint, a server custom element
  becomes interactive with zero author hydration code.

- [ ] **M2 — `hydrateRoot` whole-app reconcile-once + `defer-hydration` ordering.**
  Re-run the page render and reconcile once into the mount, grafting handlers
  onto kept server nodes (this is how plain-DOM behavior is recreated: by
  re-running its producer, not by id lookup). The reconcile stops at
  custom-element boundaries; each FC hydrates itself. Constraint #4 (handlers act
  through `event.target`/`currentTarget`/`el`). Auto-emitted `defer-hydration` on
  nested custom elements, removed by the parent to enforce top-down order.

- [ ] **M3 — Serialized JSON data-prop channel (internal).**
  The `<script id="__hydration">` payload and HTML-safe escaping (`<`/`>`/`&` +
  `</`-sequence neutralization). Keyed by a runtime-**derived** unit key
  (document-order position), never an author-chosen id; no author-facing
  accessor. Constraint: only JSON-serializable data; functions never serialize.
  Exists for FC islands that hydrate without a full root re-run.

- [ ] **M4 — Event capture-and-replay buffer.**
  Inline pre-hydration stub: single capture-phase listener per configured type,
  queue events on not-yet-hydrated units (by child-index path from the unit
  boundary), drain/re-dispatch after the unit hydrates. Best-effort into rebuilt
  FC subtrees (drop + log on unresolved path).

- [ ] **M5 — Offline-rendering / SSG integration.**
  Extend the design-A build (commit `516a87f`): inject the inline stub, collect
  the state payload, emit `defer-hydration` on nested custom elements, and inject
  a deferred client entry that **imports the page's component modules** (running
  their `FC()`/`customElements.define` calls — the entire "registration") and
  calls `start()`. The page-module contract gains an optional client-entry export
  naming those modules, in place of an id→hydrator manifest.

## Deferred (not numbered milestones)

- **Lazy `visible`/`idle` triggers** — internal and automatic; the runtime
  decides per unit with no author input. Baseline is `load`; this is a later
  task. The author surface does not change when it lands.
- **Resumability (Qwik style)** — serialized listeners + state with no replay;
  gated on a build step and a serialization format.
- **Per-route code splitting of client entries** — one module per page vs shared
  chunks; an optimization over M5's single deferred module.
- **Selective/partial root hydration** — priority-ordered root hydration rather
  than one `hydrateRoot` pass.

## Stale artifacts to regenerate

The design pivoted away from the id-registered `attach` tier. The
feature-test loop (2026-06-05) regenerated three of the four artifacts against
the no-knobs FC adopt-and-hydrate design:

- `feature-test.md` — DONE. Now the no-knobs M1 story (FC adopt on `load` +
  auto-marking); marked `*Draft 2026-06-05*`.
- `src/dom/hydrate.ts` (contract stub) — DONE. Trimmed to `start`/`hydrateRoot`;
  the `Hydrator`/`register` exports are gone.
- `src/dom/hydrate.test.ts` — DONE. Two `{ todo: true }` tests on the new API:
  FC adopt-and-hydrate (Metrics #4) and `update()` `data-hydrate` marking
  (Metrics #3). `tsc --noEmit` and `biome check` pass.
- `plan.md` — STILL STALE. Its three steps implement the deleted
  registry/dispatch/scan API; it carries `*Draft 2026-06-04*`. Regenerate in the
  planning loop AFTER the `feature-test.md` draft is cleared.
