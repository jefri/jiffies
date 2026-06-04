# Public: Which keyless child-reconciliation policy is least surprising for a functional-DOM library?

Context: the FC-render feature
(`docs/developer/2026-06-04-A-fc-render/`) hit a contradiction. The feature
test requires keyless FC output to *patch-reuse* the prior node (so a focused
input survives a re-render); `src/dom/dom.test.ts:41` pins the opposite (fresh
keyless nodes *fully rebuild*). The design asserts both. This research decides
which policy a small direct-DOM, functional-first library should adopt.

Three candidate policies:
- **(A) Positional patch-reuse-by-type** — a fresh node at the same position
  with the same tag patches and reuses the mounted node (React/Vue/lit model).
- **(B) Identity-only reuse** — a fresh node always rebuilds; only a node passed
  back by the same reference is kept. *(The library's behavior today.)*
- **(C) Explicit-key opt-in** — keyless rebuilds; reuse only with an author key.

## Findings

**Every mainstream library uses Option A as its keyless default.** The behavior
is uniform across virtual-DOM and compiled, keyed-by-reference designs:

- **React.** "When comparing two React DOM elements of the same type, React
  looks at the attributes of both, **keeps the same underlying DOM node, and
  only updates the changed attributes**." Children without keys: "React just
  iterates over both lists of children at the same time and generates a mutation
  whenever there's a difference"
  ([React Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html)).
  State is bound to *tree position*, not to the element object: "React keeps
  state for as long as the same component is rendered at the same position ...
  It's associated with the tree position in which you put that JSX"
  ([Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)).
- **Vue.** Keyless `v-for` uses an explicit "in-place patch" strategy: "instead
  of moving the DOM elements to match the order of the items, Vue will patch
  each element in-place." It is "only suitable when your list render output does
  not rely on child component state or temporary DOM state (e.g. form input
  values)" ([Vue List Rendering](https://vuejs.org/guide/essentials/list.html)).
- **lit-html.** No virtual DOM. Keyless `map()` "maintains the DOM nodes for the
  list items, but reassigns the values" — it reuses in place. `repeat` with a
  key is recommended only when "DOM nodes have state that isn't controlled by a
  template expression" ([Lit Lists](https://lit.dev/docs/templates/lists/)).
- **Mithril.** "Unkeyed children are patched in place by position." Keys are
  "only needed with lists where each entry has associated state that Mithril.js
  doesn't itself track ... in the DOM itself"
  ([Mithril Keys](https://mithril.js.org/keys.html)).
- **SolidJS.** Compiles to direct DOM and mutates in place via fine-grained
  bindings; `<For>` keys by data reference, `<Index>` keys by position — both
  reuse nodes rather than recreate them
  ([Solid `<For>`/`reconcile`](https://docs.solidjs.com/reference/store-utilities/reconcile)).

**Recreating fresh nodes every render — Option B, today's behavior — is the
documented anti-pattern, not a safe default.** It is the textbook cause of focus
loss: "When a user types one character ... the library re-renders ... because
the key was different between re-renders it throws away the old input and adds a
new input in its place," losing focus
([React.js loses input focus on typing](https://reactkungfu.com/2015/09/react-js-loses-input-focus-on-typing/)).
The universal fix is precisely position+type patch-in-place. The library's
current identity-only-rebuild path reproduces this bug at every FC boundary,
which is the motivating defect the feature exists to remove.

**The "discarded fresh node" worry is normal, expected behavior.** Under Option
A the freshly-described node is thrown away and the mounted node is patched —
exactly what React ("keeps the same underlying DOM node"), Vue ("patch each
element in-place"), and lit ("maintains the DOM nodes ... reassigns the values")
all do. Developers do not hold references to freshly-*described* nodes expecting
them in the tree; they reach for refs/keys/identity when they want a specific
node. In this library the identity-reuse path (passing the same reference back)
already serves that need and would take precedence over positional matching, so
a held reference is still honored — only genuinely-fresh same-type nodes patch.

**Explicit keys (Option C) are the escape hatch, not the default.** Across all
five libraries, keys exist to solve two problems the positional default cannot:
(1) **reordering stateful nodes** so state follows the data instead of the slot
(Vue/Mithril/lit `repeat`), and (2) **forcing re-creation** when identity must
reset (lit `keyed`: "useful when you're rendering stateful elements and you need
to ensure that all state of the element is cleared when some critical data
changes"). This maps directly onto the FC-render design's two explicit-key uses:
reorder churn (metric 4) and branchy renders giving `view`/`edit` distinct keys.
Keys complement the positional default; they do not replace it.

## Recommendation

Adopt **Option A: positional patch-reuse-by-type** as the keyless default, with
identity-reference matching taking precedence (so a node passed back by
reference is reused across positions, unchanged from today) and explicit keys as
the reorder / force-recreate escape hatch. This is the least surprising choice on
two counts: it matches the keyless default of React, Vue, lit-html, Mithril, and
Solid, and it removes the focus-loss anti-pattern the library currently exhibits.

Consequence for the plan: `dom.test.ts:41` ("rebuilds fully when every child is a
fresh node") encodes the anti-pattern and must be rewritten to assert
patch-reuse. This is the single design-stated invariant ("dom.test stays green")
that the recommendation relaxes — deliberately, because that test pins the exact
behavior the feature is built to change. Identity, reorder-by-reference, insert,
SVG, and grandchild-focus reconcile tests are unaffected.

## Sources

- [React — Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html) — canonical same-type "keep the same underlying DOM node, update changed attributes" rule; keyless child iteration.
- [React — Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state) — state is bound to tree position, not the element object; keys re-scope position.
- [Vue — List Rendering](https://vuejs.org/guide/essentials/list.html) — the "in-place patch" keyless default and its stateful-node caveat.
- [Lit — Lists](https://lit.dev/docs/templates/lists/) — keyless `map()` reuses DOM in place; `repeat`/`keyed` for stateful and force-recreate cases.
- [Mithril — Keys](https://mithril.js.org/keys.html) — unkeyed children patched in place by position; keys only for untracked per-entry state.
- [SolidJS — reconcile / `<For>`](https://docs.solidjs.com/reference/store-utilities/reconcile) — direct-DOM reuse; `<For>` by reference, `<Index>` by position.
- [React.js loses input focus on typing](https://reactkungfu.com/2015/09/react-js-loses-input-focus-on-typing/) — node recreation as the documented focus-loss anti-pattern (the falsification pass: confirms Option B is the bug, not a safe default).
