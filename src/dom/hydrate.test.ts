import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FC, type FCComponent, State } from "./fc.ts";
import { button, div, form, input } from "./html.ts";
import { hydrateRoot, start } from "./hydrate.ts";

// The `load` policy hydrates "immediately after the scan"; flush a macrotask so
// the test does not depend on whether `start()` adopts synchronously or after
// `customElements.whenDefined` resolves on a microtask.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

interface CounterState {
  count: number;
}

// An FC in the virtual_scroll idiom (`src/components/virtual_scroll.ts:155-173`):
// the render fn allocates a child element THIS render, closes over that
// reference in a handler, and calls `.update()` on the captured reference when
// the handler fires later. The handler must reach the node that is actually
// attached — if the reconcile keeps the server child and discards this fresh
// one, the closure is left pointing at a detached node and the live DOM never
// changes. Closing that hazard is the entire reason M1's FC path adopts the
// element AND rebuilds its subtree (design.md Metrics #4).
const Counter = FC<object, CounterState>("hydrate-counter", (el) => {
  const state = el[State] as CounterState;
  state.count ??= 0;

  const view = div(`Count: ${state.count}`);
  view.update({
    events: {
      click: () => {
        state.count += 1;
        view.update(`Count: ${state.count}`);
      },
    },
  });
  return view;
});
// Reference the binding so the top-level `FC(...)` (the `customElements.define`
// that makes the tag resolvable) is not flagged as unused; the test drives the
// element through the DOM, not this ctor.
void Counter;

// A Wrapper FC whose render fn contains a Counter child — used to verify
// defer-hydration ordering: the outer Wrapper's update() strips defer-hydration
// from the inner Counter via patchNode attribute sync before start() recurses.
const Wrapper = FC<object>("hydrate-wrapper", (_el) => div(Counter({})));
void Wrapper;

describe("hydrate — M1: FC adopt-and-hydrate on `load`", () => {
  // `todo` holds the draft gate: `hydrate.ts` is a contract stub whose `start()`
  // throws, so these run red. The Stop gate (`tsc --noEmit && node --test`)
  // tolerates a failing todo (exit 0). The M1 red-green-refactor loop implements
  // `start()` and the `update()` marking, then removes these markers to go green.
  it("adopts a parsed server custom element and runs its lifecycle, with no author hydration code", async (t) => {
    // Arrange — SERVER: the FC module is loaded (the top-level `FC(...)` call
    // ran `customElements.define`), so the platform upgrades a parsed
    // `<hydrate-counter>` — its constructor runs, but its `update()` does NOT.
    // A parsed FC therefore carries the server children (first paint / SEO)
    // but has no populated `State`, no client-built subtree, and no listeners.
    // There is no `data-hydrate`, no id, and no trigger attribute on the unit:
    // an FC is discovered purely by being a defined custom element.
    window.document.body.innerHTML =
      "<hydrate-counter><div>Count: 0</div></hydrate-counter>";
    const fc = window.document.body.querySelector("hydrate-counter");
    assert.ok(fc, "precondition: the server emitted a custom element");
    const serverChild = fc.querySelector("div");
    assert.ok(serverChild, "precondition: the server rendered a child subtree");
    t.after(() => {
      window.document.body.innerHTML = "";
    });

    // The parsed FC is inert: `update()` never ran, so `State` is empty and
    // clicking the server child does nothing.
    assert.equal(
      (fc as FCComponent<object, CounterState>)[State]?.count,
      undefined,
      "precondition: update() has not run on the upgraded element",
    );
    (serverChild as HTMLElement).click();
    assert.equal(
      fc.textContent,
      "Count: 0",
      "precondition: server HTML alone carries no behavior",
    );

    // Act — ship JS after paint: `start()` scans `root` for defined custom
    // elements and, on the `load` policy, adopts each as the live `el` and
    // runs `el.update()`. No `register`, no `markHydrate`, no string id.
    start(window.document.body);
    await tick();

    // Assert — the SAME custom element node was adopted (the unit boundary is
    // never detached, so there is no flash at the boundary)...
    assert.strictEqual(
      window.document.body.querySelector("hydrate-counter"),
      fc,
      "hydration adopted the live server element; it did not replace it",
    );
    // ...its genuine lifecycle ran: the render fn populated `State`...
    assert.equal(
      (fc as FCComponent<object, CounterState>)[State]?.count,
      0,
      "el.update() ran the render fn, populating State",
    );
    // ...and the FC rebuilt its own subtree, so the attached child is the
    // freshly-rendered node, not the server child it replaced.
    const child = fc.querySelector("div");
    assert.ok(child, "the FC rendered a child after hydration");
    assert.notStrictEqual(
      child,
      serverChild,
      "the FC rebuilt its subtree; the server child was replaced",
    );

    // Assert — metric #4: the handler closes over the child reference the
    // render allocated; because the FC adopted-and-rebuilt, that captured
    // reference IS the attached node, so clicking drives a re-render through
    // it and the live DOM changes.
    (child as HTMLElement).click();
    assert.equal(
      (fc as FCComponent<object, CounterState>)[State]?.count,
      1,
      "the live handler ran",
    );
    assert.equal(
      fc.textContent,
      "Count: 1",
      "the captured reference updated the ATTACHED node, not a detached one",
    );
  });

  it("update() stamps data-hydrate when behavior is attached, and omits it otherwise", () => {
    // Marking is a side effect of attaching behavior at the single `update()`
    // seam, not an author decision: any element that leaves `update()` with a
    // non-empty `[Events]` map carries a valueless boolean `data-hydrate`,
    // which `outerHTML` serializes for free (design.md Metrics #3).
    const interactive = button({ events: { click: () => undefined } }, "Click");
    assert.ok(
      interactive.hasAttribute("data-hydrate"),
      "a behavior-bearing element is marked hydratable",
    );

    const inert = button("Static");
    assert.ok(
      !inert.hasAttribute("data-hydrate"),
      "an element with no listeners is never marked",
    );
  });
});

describe("hydrate — M2: hydrateRoot whole-app reconcile", () => {
  it("reconciles without detaching the shell: a focused input's node identity survives", (t) => {
    // Arrange — SERVER: a page with plain-DOM elements. A focused input simulates
    // user state that exists before JS ships (focus, typed value). The shell must
    // never be detached: focus and scroll position survive only if the exact node
    // is kept in place, not replaced.
    window.document.body.innerHTML = `<form><input name="q" value="hello"><button type="submit">Go</button></form>`;
    const serverInput = window.document.body.querySelector(
      "input",
    ) as HTMLInputElement;
    assert.ok(serverInput, "precondition: server emitted an input");
    serverInput.focus();
    assert.strictEqual(
      window.document.activeElement,
      serverInput,
      "precondition: input holds focus before hydrateRoot",
    );
    t.after(() => {
      window.document.body.innerHTML = "";
    });

    // Act — re-run the same render, reconcile ONCE onto the live shell. The call
    // is synchronous so the assertion below tests the reconcile pass directly,
    // before any async FC-adopt scheduled by start() has run.
    hydrateRoot(window.document.body, () => [
      form(
        input({ name: "q", value: "hello" }),
        button({ type: "submit" }, "Go"),
      ),
    ]);

    // Assert — the reconcile kept the server input by identity (it was already
    // mounted) or by positional same-tag match, so the node object is identical
    // and focus was never lost.
    const hydratedInput = window.document.body.querySelector("input");
    assert.strictEqual(
      hydratedInput,
      serverInput,
      "hydrateRoot kept the server input node; it did not detach and replace it",
    );
    assert.strictEqual(
      window.document.activeElement,
      serverInput,
      "the input keeps focus after hydrateRoot",
    );
  });

  it("stops at custom-element boundaries: hydrateRoot does not recurse into FC server children", (t) => {
    // Arrange — SERVER: a plain wrapper div containing a custom element with
    // server-rendered children. The outer hydrateRoot reconcile must treat the
    // custom element as an opaque leaf: keep its node by positional same-tag
    // matching but do NOT recurse into its children. Those children belong to
    // the FC's own start()-triggered adopt, which runs asynchronously later.
    window.document.body.innerHTML = `<div><hydrate-counter><div id="server-child">Count: 0</div></hydrate-counter></div>`;
    const serverFc = window.document.body.querySelector(
      "hydrate-counter",
    ) as Element;
    const serverChild = window.document.body.querySelector(
      "#server-child",
    ) as Element;
    assert.ok(serverFc, "precondition: server FC present");
    assert.ok(serverChild, "precondition: server FC child present");
    t.after(() => {
      window.document.body.innerHTML = "";
    });

    // Act — synchronous call only; do NOT await tick so start()'s async FC-adopt
    // path has not yet run. This isolates the synchronous reconcile pass.
    hydrateRoot(window.document.body, () => [div(Counter({}))]);

    // Assert — the reconcile kept the server FC element by positional same-tag...
    assert.strictEqual(
      window.document.body.querySelector("hydrate-counter"),
      serverFc,
      "hydrateRoot kept the server FC element node",
    );
    // ...and left its server children untouched because it treated the FC as an
    // opaque leaf. The FC's own start()-triggered adopt will rebuild its subtree
    // in a separate async pass; that replacement is expected and separate.
    assert.strictEqual(
      window.document.body.querySelector("#server-child"),
      serverChild,
      "hydrateRoot did not recurse into the FC subtree",
    );
  });

  it("defer-hydration enforces parent-before-child ordering", async (t) => {
    // Arrange — SERVER: a Wrapper FC (outer) containing a Counter FC (inner).
    // The serializer emits `defer-hydration` on the nested inner FC so that
    // start() does not attempt to hydrate it before the outer FC has settled.
    // Mechanism: the outer FC's update() reconciles its subtree using regular
    // patchNode, which syncs attributes from the fresh Counter node (no
    // defer-hydration) onto the kept server node, stripping the attribute.
    // start() then recurses into the outer FC and hydrates the now-accessible inner.
    window.document.body.innerHTML = `<hydrate-wrapper><div><hydrate-counter defer-hydration></hydrate-counter></div></hydrate-wrapper>`;
    const inner = window.document.body.querySelector(
      "hydrate-counter",
    ) as Element;
    assert.ok(inner, "precondition: inner FC present");
    assert.ok(
      inner.hasAttribute("defer-hydration"),
      "precondition: inner FC carries defer-hydration from the serializer",
    );
    t.after(() => {
      window.document.body.innerHTML = "";
    });

    // Act — hydrateRoot reconciles the outer shell (Wrapper is an opaque leaf),
    // then start() hydrates Wrapper; Wrapper's update() strips defer-hydration
    // from inner via patchNode, then start() recurses to hydrate inner.
    hydrateRoot(window.document.body, () => [Wrapper({})]);
    await tick();

    // Assert — the inner FC's defer-hydration was stripped by the outer FC's
    // reconcile pass, allowing the inner to be reached and hydrated afterward.
    assert.ok(
      !inner.hasAttribute("defer-hydration"),
      "defer-hydration was removed from the inner FC after the outer FC adopted",
    );
    // The inner FC's own lifecycle ran: State was populated by its render fn.
    assert.equal(
      (inner as FCComponent<object, CounterState>)[State]?.count,
      0,
      "inner FC's lifecycle ran after the outer FC released the defer-hydration gate",
    );
  });
});
