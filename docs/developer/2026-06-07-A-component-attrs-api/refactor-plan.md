# Refactor plan — component attrs API

Scope: files changed in this loop (`git diff --name-only HEAD` against the feature
commit) — `src/components/*.ts`. Working dir clean for these files; tests green (34/34).

## Smells

- [x] ~~**Comments (stale/misleading)** — `alert.ts:26`, `card.ts:38`, `form.ts:16`,
  `nav.ts:31`, `property.ts:21`. Each invariant ends "emits no class attribute," which
  is no longer accurate: a component emits no class *of its own*, but now forwards a
  caller-supplied class (and other attrs) to its outermost element. Reword to state the
  default-no-class invariant without contradicting the new forwarding contract.~~ Done.

## Considered, not actioned

- **Three-Strikes / duplicated forwarding** — every component destructures its domain
  props and passes the remaining `attrs` as the first argument of its outer-element
  builder. Not extracted: the builder and children differ per component, the forwarding
  is already a single idiomatic call, and a shared `applyAttrs` helper would be a Middle
  Man adding indirection without removing a line. The uniform one-liner *is* the design.
