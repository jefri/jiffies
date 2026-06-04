# Node Modernization Tasks

- FC render reuses stable child references: FC's render function builds fresh nodes each
  render, so the dom-reconcile identity diff collapses to a full rebuild inside FC output.
  Investigate letting FC render reuse stable child references so reconcile preserves identity
  within FC output. Deferred from the dom-reconcile feature (reconcileChildren landed in
  src/dom/dom.ts).

- Explicit child keys to minimize reorder churn: reconcileChildren moves a reused child that
  changes position via insertBefore, which detaches-then-inserts it and fires
  connect/disconnect on a custom element. Stationary reuse — the target case — is never
  detached. An optional `key` attribute (or similar) could minimize reorder moves. Deferred
  from the dom-reconcile feature.


