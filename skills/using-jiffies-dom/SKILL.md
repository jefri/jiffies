---
name: using-jiffies-dom
description: Use when building or updating UI in a project that depends on @davidsouther/jiffies.
---

# Using Jiffies DOM

## Overview

Jiffies DOM is a tiny functional library that implements **reentrant DOM**, where every
node is a function that when called again updates its contents. There are exactly two
operations:

- **Create:** calling a tag function (`div(...)`, `button(...)`, `circle(...)`) makes a
  **new** node every time.
- **Update in place:** every node Jiffies creates carries an `.update(attrs?, ...children)`
  method. Calling it mutates **that same node** — same identity, no replacement.

To update a node later, you must **keep a reference to it** and call `.update()` on it.
Calling the tag function again does not update the old node; it builds a new one. 

> Ideally, the object returned from the tag function would itself be directly callable, so instead of `const el = div({'class': 'off'}); el.update({'class': 'on'});`, you could just do `const el = div({'class': 'off'}); el({'class': 'on})';`. This is possible by wrapping the returned `HTMLDivElement` in a `Proxy` that implements a call interceptor, but `Proxy` cannot be passed to DOM APIs like appendChildren or addEventListener.

## Import paths (get this right first)

The package is `@davidsouther/jiffies` and its export map is `"./*.ts": "./src/*.ts"`.
Imports use the real subpath **with the `.ts` extension**:

```ts
import { div, button, span, ul, li, p } from "@davidsouther/jiffies/dom/html.ts";
import { FC, State } from "@davidsouther/jiffies/dom/fc.ts";
import { svg, circle } from "@davidsouther/jiffies/dom/svg.ts";
```

The package READMEs show `jiffies/dom/html` — that path is **wrong**. Only `html` and `fc`
are re-exported from `dom/index.ts`; reach `svg`, `observable`, `router`, `provide`, and
`xml` by their own deep paths.

## Quick reference

| You want to… | Do this |
|---|---|
| Create an element | `div(attrs?, ...children)` — first arg is attrs only if a plain object |
| Update a node in place | hold a reference to the node, then call `node.update(attrs?, ...children)` |
| Set children only | `node.update("new text")` or `node.update(child1, child2)` |
| Empty children | `import { CLEAR } from ".../dom/dom.ts"; node.update(CLEAR)` |
| Add an event | `button({ events: { click: (e) => {...} } })` |
| Replace an event handler | `node.update({ events: { click: newHandler } })` — old listener is removed first |
| Remove an event | `node.update({ events: { click: null } })` |
| Set a class | `div({ class: "a b" })` or `{ class: ["a", "b"] }` |
| Remove a class on update | `node.update({ class: "!hidden" })` (`!` prefix removes) |
| Inline style | `{ style: { flexDirection: "column" } }` or `{ style: "color:red" }` |
| Boolean attribute | `{ disabled: true }` (falsy removes the attribute) |

## The argument rule (common error source)

The first argument is treated as an **attributes object** only if it is a plain object with
no `nodeType`. A string, a Node, or `CLEAR` is treated as the **first child**.

```ts
div({ class: "row" }, span("a"), span("b")); // attrs + 2 children
div(span("a"), span("b"));                    // 0 attrs, 2 children
div("hello");                                 // 0 attrs, 1 text child
```

## Example: in-place Counter

The number node is created once and reused on every click. The tag function is the create;
`display.update(...)` is the reentrant update.

```ts
import { div, span, button } from "@davidsouther/jiffies/dom/html.ts";

export function Counter(start = 0) {
  let count = start;
  const display = span(`${count}`); // created ONCE — keep the reference

  return div(
    display,
    button(
      { events: { click: () => { count += 1; display.update(`${count}`); } } },
      "+1",
    ),
  );
}
```

## FC: stateful components

Use `FC` when a component owns state and should re-render itself from props. `FC(name, render)`
defines a custom element and returns a constructor. Calling it creates the element; calling
`.update(props)` **merges** props, re-runs `render`, and reconciles the rendered output into the host.

```ts
import { FC } from "@davidsouther/jiffies/dom/fc.ts";
import { section, h2, ul, li } from "@davidsouther/jiffies/dom/html.ts";

export const TodoList = FC<{ title: string; items: string[] }>(
  "todo-list",
  (_el, { title, items }) =>
    section(h2(title ?? "Todos"), ul(...items.map((i) => li(i)))),
);

const list = TodoList({ title: "Chores", items: ["wash", "fold"] });
document.body.append(list);
list.update({ items: ["wash", "fold", "iron"] }); // title is retained (props merge)
```

The render function is `(el, props, children) => Element | Element[]`. `el` is the host
custom element (also typed to carry `.update()` and the `State` symbol). It may return a
single node or an array. Persist component state on the host via the `State` symbol:

```ts
import { FC, State } from "@davidsouther/jiffies/dom/fc.ts";

export const Toggle = FC<{ label: string }, { on: boolean }>(
  "app-toggle",
  (el, { label }) => {
    el[State] ??= { on: false };          // initialise once; retained across updates
    const s = el[State];
    return button(
      { events: { click: () => { s.on = !s.on; el.update(); } } }, // el.update() re-renders
      `${label}: ${s.on ? "on" : "off"}`,
    );
  },
);
```

## FCC: server-rendered, client-hydrated components

`FCC` (containerless functional component) is the third form. Unlike `FC`, it has **no
custom-element wrapper**: it renders its children directly into a *boundary element* you
supply, so the markup it produces is plain HTML with no extra host tag. That makes it the
form to reach for when the page is **server-rendered (SSG) and hydrated on the client** —
the boundary element exists in the emitted HTML, and hydration re-attaches behaviour to it.

```ts
import { FCC } from "@davidsouther/jiffies/dom/fc.ts";
import { div, output } from "@davidsouther/jiffies/dom/html.ts";

const boundary = () => div({ class: "gauge" }); // the FCC's root element
export const Gauge = FCC<{ value: number }>("gauge", boundary, (_el, attrs) => [
  output(`${attrs.value}`),
]);
```

`FCC(name, boundaryFactory, render)` — `render(el, attrs) => Element | Element[]` returns the
**children** of the boundary; the boundary itself comes from the factory. Working examples
live in `fcc.test.ts` and `hydrate.test.ts`.

### Choosing a form

- **Plain reentrant node** (`div(...)` + held reference + `.update()`) — a one-off subtree you
  build and mutate imperatively from one place. The default; reach for it first.
- **`FC`** — a reusable component that owns state and re-renders from props, where an extra
  custom-element host tag in the DOM is acceptable.
- **`FCC`** — a reusable component whose markup must be server-rendered and hydrated, or where
  a wrapper element is unwanted. SVG components must use the FCC form.  Everything below is FCC-specific and **does not** apply to the
  other two forms.

### Every prop is written onto the boundary as an attribute

Before `render` runs, an FCC applies its props to the boundary with `setAttribute(key,
String(value))`. So props must be **DOM-valid attribute values** — strings, numbers, booleans.
Consequences if you ignore this:

- A **function** prop named `onChange`/`onToggle` lowercases to the `onchange`/`ontoggle`
  *content attribute*, which jsdom and real browsers compile as a live inline handler the
  moment a matching event bubbles to the boundary — a hard crash ("Function statements require
  a function name") or silently wrong execution.
- An **object/array** prop becomes `"[object Object]"` junk that serializes into the SSG HTML.

Pass dynamic DOM-valid values (`checked`, `value`, `class`) as props; deliver everything else
another way:

- **Close static config and callbacks over a factory** that returns the FCC — the canonical
  fix. The factory captures `onChange`, ids, etc.; only DOM values flow as props.
- **Wire events with the `events:` attr** (special-cased to `addEventListener`, never
  serialized).
- **Deliver controller callbacks once via a dedicated `.wire()` method** on the handle (it sets
  closure holders and touches no attribute).
- Set form state through the sanctioned **`.value`/`.checked` property assignment**.
- An unavoidable inert object prop can be dropped in render with `up(el, { state: false })`.

### The `.update()` graft does not survive SSG serialize→reparse

Every node Jiffies builds in-process carries a grafted `.update()` method — a function 
that **does not serialize**. When the SSG renders the page to an HTML string and the browser
re-parses it, the resulting elements are brand-new objects with **no `.update()`**. So client
code that queries a page-emitted element and calls `el.update(...)` — or `el?.update?.(...)`,
which hides the failure — is a **silent no-op in production**.

Drive raw, page-emitted elements with **`up()`** from `@davidsouther/jiffies/dom/dom.ts`
instead: `up(el, attrs, ...children)` applies attrs / class tokens (`"!x"` removes) / style /
`events` / children to *any* raw element, no graft required. In-memory tests that mount the
page module directly keep the graft and will pass while production is broken — guard the path
with a **round-trip test** (`outerHTML` → `container.innerHTML = html` → drive the view).
Client-built FCC handles created at runtime (not page-emitted) legitimately keep `.update()`.

### Constructing an FCC at SSG build time

- Use `window.document` (Jiffies sets `global.window`, not a bare `document`).
- Guard `getComputedStyle` — it is absent during SSG.

## Typing nodes

You do not need a Jiffies-specific type to hold a node. Jiffies augments the global DOM
`Element` interface with `.update()`, so standard lib types already carry it:

```ts
const display: HTMLSpanElement = span("0");
display.update("1"); // .update is in scope on every Element
```

`dom/dom.ts` also exports `DOMElement` (`Element & ElementCSSInlineStyle`) for the general case.

## Updates reconcile children by identity

`.update(...children)` reconciles the new child list against the mounted children **by node
object identity**. A child you pass back by the **same reference** is left in place and never
detached, so its focus, scroll position, text selection, event listeners, and any descendant
state survive the update. A freshly built node (or a string) has no matching identity, so it
is inserted; a mounted child you omit is removed; order follows the argument list.

This means you can update a parent and keep a specific subtree alive by passing the same node
reference back through it:

```ts
const panel = div(span("Title"), input({ name: "q" })); // keep this reference
const root = div(panel, p("status"));
// ...later: replace the status line but keep the panel (and its focused input):
root.update(panel, p("ready")); // panel is reused in place; only the <p> is rebuilt
```

Strings always rebuild (they carry no identity). The same reference must not appear twice in
one update — a DOM node can occupy only one position.

For fine-grained leaf updates (e.g. a counter), you can still hold a reference to the specific
child node and call `.update()` on **that** node directly. **FC is the exception:** its
`render` builds fresh nodes each update, so identity is not preserved inside an FC's own
output (see the common mistake below).

## Testing

Tests use the `scope` microframework and run under Node (jsdom loads automatically when
`window` is undefined). Run with `npm test` (`node ./src/test.mjs`).

```ts
import { describe, it, expect } from "@davidsouther/jiffies/scope/index.ts";
import { button } from "@davidsouther/jiffies/dom/html.ts";

describe("counter", () => {
  it("reuses the node on update", () => {
    const b = button("0");
    b.update("1");
    expect(b.textContent).toBe("1");
  });
});
```

## Common mistakes

- **Calling the tag function again to "update."** That creates a new node. Hold the
  reference and call `.update()` on it.
- **Expecting event handlers to stack.** Calling `node.update({ events: { click: newFn } })`
  removes the old listener before adding the new one. Each event key tracks exactly one
  listener; the last one set is the one that fires.
- **Importing `jiffies/dom/html`.** Use `@davidsouther/jiffies/dom/html.ts` (full name, `.ts`).
- **Passing a config object as the first child.** A plain object becomes attrs; wrap text/nodes
  as children explicitly.
- **Expecting FC `.update()` to preserve child DOM identity.** It re-renders and replaces
  children. For stable child nodes, update them directly.
- **Using namespace-qualified SVG attributes.** `update()` always calls `setAttribute`, not
  `setAttributeNS`. Attributes on SVG elements are plain unqualified names; read them back with
  `getAttribute`, not `getAttributeNS`.
- **Copying README examples verbatim.** The package README snippets are illustrative and not
  all valid TypeScript; rely on this skill and the `*.test.ts` files for working code.
- **Passing a callback or object as an FCC prop.** Every FCC prop is `setAttribute`'d onto the
  boundary; a function becomes a live `onchange`/`ontoggle` handler (crash) and an object
  becomes `"[object Object]"`. Close them over a factory, or use `events:` / `.wire()`.
- **Calling `.update()` on a page-emitted (SSG-reparsed) element.** The graft did not survive
  serialization; the call is a silent no-op. Use `up()` on raw elements and guard with a
  round-trip test.
