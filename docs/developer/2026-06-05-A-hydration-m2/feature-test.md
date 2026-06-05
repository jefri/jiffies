# Hydration M2 Feature Test

## User Story

A developer ships a server-rendered page. The HTML reaches the browser and can 
paint right away. JavaScript arrives afterward. `hydrateRoot(mount, render)` is called
once with the page's render fn. The browser's live DOM becomes interactive
without any visible flash, lost focus, or replaced shell nodes. Custom elements
in the page are treated as self-contained islands: `hydrateRoot` grafts handlers
onto plain-DOM elements in the shell but stops at every custom-element boundary,
leaving those subtrees for each FC's own adopt-and-rebuild pass. The serializer
stamps `defer-hydration` on nested custom elements so that a child FC cannot
hydrate before its parent has settled; the parent's reconcile pass strips that
attribute, releasing the child.

## Test File

`src/dom/hydrate.test.ts` — `describe("hydrate — M2: hydrateRoot whole-app reconcile")`

## Test Cases

### 1 — Shell node identity survives

**Given** a server-rendered page with a plain `<form>` containing an `<input>`
that the user has focused before JS ships,
**When** `hydrateRoot(body, renderFn)` is called,
**Then** the `<input>` node object is the same reference after the call and the
input still holds focus.

Assertion: `querySelector("input") === serverInput` and
`document.activeElement === serverInput`.

### 2 — FC boundary is opaque (synchronous)

**Given** a server-rendered page with a `<div>` wrapping a `<hydrate-counter>`
that carries a `<div id="server-child">` inside it,
**When** `hydrateRoot` is called (synchronously, no tick),
**Then** `querySelector("hydrate-counter")` is the same node and
`querySelector("#server-child")` is the same node — the reconcile did not
recurse into the FC subtree.

### 3 — `defer-hydration` enforces parent-before-child ordering

**Given** a server-rendered page where `<hydrate-wrapper>` contains
`<hydrate-counter defer-hydration>`,
**When** `hydrateRoot` is called and one async tick passes,
**Then** `hydrate-counter` no longer has `defer-hydration` and its `State.count`
is `0` — the outer Wrapper's `update()` stripped the attribute via `patchNode`
attribute sync, and `start()` recursed to hydrate the inner FC afterward.
