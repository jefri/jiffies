# Codebase: the reentrant / callable DOM in Jiffies

## Findings

### The core duality: create vs. update

The "reentrant DOM" lives in `src/dom/dom.ts`. Two functions carry the whole idea.

- `update(element, attrs, children)` (`dom.ts:89`) is the workhorse. It applies events,
  style, class, and attributes to an existing element, replaces its children, and then —
  the key line — attaches an `.update()` method to the element itself:

  ```ts
  (element as Element).update ??= (attrs, ...children) =>
    update(element, ...normalizeArguments(attrs, children));
  ```

  The `??=` makes it idempotent. After the first pass, the node carries a closure that
  re-enters `update` against the *same* node. That is the reentrancy: the node knows how
  to update itself in place.

- `up(element, attrs, ...children)` (`dom.ts:81`) is the create-time convenience. It
  normalizes arguments and calls `update`.

The duality:
- **Tag function = create.** Every call to a tag function makes a new node.
- **`node.update(...)` = update.** Calling the instance method mutates that node in place,
  same identity, no replacement.

Both paths funnel through the one `update` implementation, so create and update share
semantics exactly.

### Tag functions (html.ts, svg.ts)

`html.ts` and `svg.ts` are generated from one factory each:

```ts
const makeHTMLElement = (name) => (attrs?, ...children) =>
  up(window.document.createElement(name), attrs, ...children);
```

So `div(...)`, `button(...)`, `circle(...)` all do "create element, then `up` it." Calling
a tag function *always* creates. SVG uses `createElementNS` with the SVG namespace.

### Argument normalization (the non-obvious rule)

`normalizeArguments` (`dom.ts:64`) + `isAttrs` (`dom.ts:52`) decide whether the first
argument is an attributes object or the first child. The rule: it is attrs only if it is a
plain object with no `nodeType`. A Node, a string, or `CLEAR` is treated as a child. This
is the single most error-prone behavior for a newcomer or an agent — `div(someNode, ...)`
and `div({class: "x"}, ...)` are both valid and mean different things.

### DomAttrs conventions

`update` interprets a few keys specially (`dom.ts:99`+):
- `class` — string or array; a `!`-prefixed token *removes* a class. Undocumented.
- `style` — string (set as `cssText`) or object (assigned key by key).
- `events` — map of event name to handler; `null` removes, tracked in an `Events` symbol map.
- everything else becomes a DOM attribute (`true` => boolean attr, falsy => removed).
- `CLEAR` symbol as the first child empties children.

### FC: the stateful, identity-retaining component (fc.ts)

`FC(name, renderFn)` defines a custom element class and returns a constructor.
- Calling the constructor creates the element and calls `.update()`.
- The element's `.update()` (`fc.ts:40`) merges attrs into private `#attrs`, stores
  children, applies attrs to itself via the shared `update(this, ...)`, then **re-runs the
  render function** and `replaceChildren` with its output.
- State persists on the element through the `State` symbol (`fc.ts:11`). The element node
  identity is retained across updates; its children are re-rendered.

This is the second flavor of reentrancy: with `FC`, the component instance is stable and
re-renders itself on update. `inline_edit.ts` and `virtual_scroll.ts` use this — they call
`el.update(render())` to refresh.

### Reactive and routing layers

- `observable.ts` `O(element, observable)` subscribes a stream to `element.update(...t)` —
  reactive in-place updates.
- `router/router.ts` — the Router is itself callable: `Router.for(...)` returns a function
  you invoke with a target element; navigation calls `target.update(newContent)`. Same
  reentrant `.update` contract, applied to route swapping.
- `provide.ts` — a minimal global DI registry (`provide`/`retrieve`).
- `xml.ts` — string-based XML builder, the odd one out: no reentrancy, returns a string.

### Type integration

`dom.ts:41` augments the global `Element` interface with `[Events]` and `update()`, so any
`Element` in a consuming project gains a typed `.update()`. `Attrs<E, S>` maps element keys
to `string | number | boolean` plus the `DomAttrs` extras.

### Observations worth a test (and a conversation)

1. **Event handlers stack on update.** In `update` (`dom.ts:107`), a non-null handler
   always calls `addEventListener` and overwrites the `Events` map entry. Repeated
   `.update({events:{click: fnA}})` then `.update({events:{click: fnB}})` adds a *second*
   listener; the map only remembers the last, so `{click: null}` removes only one. The
   reentrant update path leaks listeners. No test covers replace-vs-stack today
   (`html.test.ts` only tests add-once and remove-once).

2. **Dead namespace branch.** `dom.ts:148-152`: `useNamespace` is hardcoded `false`, and
   the expression that was meant to assign it is computed and discarded. Namespaced
   attribute writes (`setAttributeNS`) are unreachable. Looks like a half-finished
   refactor. SVG attributes currently always go through `setAttribute`.

3. **Children replacement is wholesale.** `.update()` with children calls
   `replaceChildren` (`dom.ts:173`). There is no reconciliation. Updating a parent destroys
   child identity, focus, listeners, and FC state. Reentrancy is one level deep by design;
   this is the central trade-off to surface in docs.

4. **`index.ts` exports only `fc` and `html`.** `svg`, `xml`, `observable`, `provide`,
   `router`, `css`, and `form` are not re-exported from `src/dom/index.ts`. Consumers
   importing `jiffies/dom` cannot reach them without deep paths.

## Sources
- [1] `src/dom/dom.ts` [1cf30ff] — core `update`/`up`/`normalizeArguments`, the reentrant hook
- [2] `src/dom/fc.ts` [1cf30ff] — stateful component, retained identity, re-render on update
- [3] `src/dom/html.ts` [1cf30ff] — HTML tag factory (create path)
- [4] `src/dom/svg.ts` [1cf30ff] — SVG tag factory, namespaced create
- [5] `src/dom/observable.ts` [1cf30ff] — reactive `.update` binding
- [6] `src/dom/router/router.ts` [1cf30ff] — callable router, `.update` for route swap
- [7] `src/dom/provide.ts` [1cf30ff] — global DI registry
- [8] `src/dom/xml.ts` [1cf30ff] — string XML builder (no reentrancy)
- [9] `src/dom/index.ts` [1cf30ff] — partial re-export surface
- [10] `src/components/inline_edit.ts`, `src/components/virtual_scroll.ts` [1cf30ff] — FC update-in-place usage
- [11] `src/dom/html.test.ts`, `src/dom/fc.test.ts` [1cf30ff] — current test coverage
- [12] `src/dom/README.md` [1cf30ff] — stated intent
