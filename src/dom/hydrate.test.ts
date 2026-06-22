import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FileSystem, RecordFileSystemAdapter } from "../fs.ts";
import { build, type PageModule } from "../ssg/ssg.ts";
import { FC, FCC, type FCComponent, State } from "./fc.ts";
import { button, div, form, input, span } from "./html.ts";
import {
  buildPayload,
  hydrateRoot,
  installCaptureStub,
  readPayload,
  start,
} from "./hydrate.ts";

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

interface GreetProps {
  name: string;
  count?: number;
}

// An FC whose render fn echoes its props into text so tests can assert which
// props reached the component without inspecting internal state symbols.
const Greeter = FC<GreetProps>("hydrate-greeter", (_el, attrs) => {
  const text = `Hello ${attrs.name ?? "?"} x${attrs.count ?? 0}`;
  return div(text);
});
void Greeter;

// An FCC (host-free, `data-fc` boundary) whose child echoes a prop. Used to test
// that hydration carries props to both component forms, and as a nested unit.
const Badge = FCC<{ label: string }>("hydrate-badge", div, (_el, attrs) =>
  span(`[${attrs.label ?? "?"}]`),
);
void Badge;

// An FC containing a Badge: the Badge is a NESTED unit, so the server payload
// lists it between two top-level units in document order.
const Panel = FC<{ who: string }>("hydrate-panel", (_el, attrs) =>
  div(Badge({ label: attrs.who ?? "?" })),
);
void Panel;

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

describe("hydrate — M3: state channel (serialized JSON data-prop channel)", () => {
  it("buildPayload serializes props by document-order index with XSS escaping", () => {
    // Arrange — two units with different prop shapes, one containing characters
    // that would break an inline <script> tag if unescaped.
    const units: Record<string, unknown>[] = [
      { name: "Alice", count: 3 },
      { label: "</script><script>alert(1)</script>", flag: true },
    ];

    // Act — buildPayload(units) returns the JSON string that the server embeds
    // inside the <script type="application/json" id="__hydration"> element.
    const payload = buildPayload(units);

    // Assert — the result round-trips: JSON.parse recovers the original values.
    const parsed = JSON.parse(payload) as Record<string, unknown>[];
    assert.deepEqual(parsed[0], { name: "Alice", count: 3 });
    assert.deepEqual(parsed[1], {
      label: "</script><script>alert(1)</script>",
      flag: true,
    });

    // Assert — the raw string never contains a literal </script> sequence that
    // would break the containing script element before the parser closes it.
    assert.ok(
      !payload.includes("</script>"),
      "payload must not contain unescaped </script>",
    );
    // The injected unicode escape survives JSON.parse transparently.
    assert.ok(
      payload.includes("\\u003c") || payload.includes("<\\/script>"),
      "payload escapes < or </ to prevent script injection",
    );
  });

  it("readPayload parses the __hydration script tag from the document", () => {
    // Arrange — insert the payload script that the server would have emitted.
    const data = [{ name: "Bob" }, { count: 7 }];
    const script = window.document.createElement("script");
    script.type = "application/json";
    script.id = "__hydration";
    script.textContent = buildPayload(data);
    window.document.head.appendChild(script);

    // Act — readPayload() locates the script by id and returns the parsed array.
    const result = readPayload();

    // Assert — the values are recovered faithfully.
    assert.deepEqual(result, data);

    // Cleanup
    script.remove();
  });

  it("position-indexed key maps each unit to its props by document order", () => {
    // Arrange — two Greeter FCs in document order; the payload maps index 0 and
    // index 1 to different props. readPayload returns an array so position IS the
    // key — no author-chosen id.
    const payload = buildPayload([
      { name: "First", count: 1 },
      { name: "Second", count: 2 },
    ]);
    const script = window.document.createElement("script");
    script.type = "application/json";
    script.id = "__hydration";
    script.textContent = payload;
    window.document.head.appendChild(script);

    window.document.body.innerHTML = `
      <hydrate-greeter></hydrate-greeter>
      <hydrate-greeter></hydrate-greeter>
    `;
    const units = Array.from(
      window.document.body.querySelectorAll("hydrate-greeter"),
    );
    assert.equal(units.length, 2, "precondition: two greeter units in DOM");

    // Act — readPayload(), then verify index 0 -> first props, index 1 -> second.
    const result = readPayload();
    assert.deepEqual(result[0], { name: "First", count: 1 });
    assert.deepEqual(result[1], { name: "Second", count: 2 });

    // Cleanup
    script.remove();
    window.document.body.innerHTML = "";
  });

  it("start() reads the payload and passes props to each unit's update()", async (t) => {
    // Arrange — server emitted two Greeter FCs; payload carries their props.
    const script = window.document.createElement("script");
    script.type = "application/json";
    script.id = "__hydration";
    script.textContent = buildPayload([
      { name: "Carol", count: 5 },
      { name: "Dave", count: 9 },
    ]);
    window.document.head.appendChild(script);

    window.document.body.innerHTML = `
      <hydrate-greeter><div>Hello ? x0</div></hydrate-greeter>
      <hydrate-greeter><div>Hello ? x0</div></hydrate-greeter>
    `;
    t.after(() => {
      script.remove();
      window.document.body.innerHTML = "";
    });

    // Act — start() discovers the payload, passes indexed props to each unit.
    start(window.document.body);
    await tick();

    // Assert — each FC's render fn received its props from the payload, so the
    // text content reflects the server-supplied name and count values.
    const greeters = Array.from(
      window.document.body.querySelectorAll("hydrate-greeter"),
    );
    assert.equal(
      greeters[0]?.textContent?.trim(),
      "Hello Carol x5",
      "first unit received its payload props",
    );
    assert.equal(
      greeters[1]?.textContent?.trim(),
      "Hello Dave x9",
      "second unit received its payload props",
    );
  });
});

describe("hydrate — M4: event capture-and-replay", () => {
  it("installCaptureStub queues an event dispatched on a child of an un-hydrated FC", (t) => {
    // Arrange — SERVER: a hydrate-counter FC with a child div. The FC has not
    // been hydrated yet (no start() called), so its subtree is inert server HTML.
    // installCaptureStub installs capture-phase listeners on document for the
    // standard event types; events targeting nodes inside un-hydrated FC units
    // must land in the global queue rather than being lost.
    window.document.body.innerHTML =
      "<hydrate-counter><div>Count: 0</div></hydrate-counter>";
    const fc = window.document.body.querySelector("hydrate-counter") as Element;
    const serverChild = fc.querySelector("div") as HTMLElement;
    assert.ok(fc, "precondition: server FC present");
    assert.ok(serverChild, "precondition: server FC child present");
    t.after(() => {
      window.document.body.innerHTML = "";
      // Reset the global queue between tests.
      (window as unknown as Record<string, unknown>).__hydrateQueue = undefined;
    });

    // Act — install the capture stub, then dispatch a click on the server child
    // before hydration. The stub intercepts it and enqueues a descriptor.
    installCaptureStub();
    serverChild.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Assert — the global queue has one entry whose unitEl is the FC boundary
    // element and whose type is "click". The targetPath encodes the path from
    // the FC element to the server child via childNodes indices.
    const queue = (window as unknown as Record<string, unknown>)
      .__hydrateQueue as Array<{
      unitEl: Element;
      type: string;
      targetPath: number[];
      init: Record<string, unknown>;
    }>;
    assert.ok(Array.isArray(queue), "global queue was created");
    assert.equal(queue.length, 1, "one event was queued");
    assert.strictEqual(queue[0].unitEl, fc, "unitEl is the FC boundary");
    assert.equal(queue[0].type, "click", "event type is recorded");
    assert.ok(
      Array.isArray(queue[0].targetPath),
      "targetPath is an array of childNode indices",
    );
  });

  it("start() re-dispatches the queued event on the resolved live node after hydration", async (t) => {
    // Arrange — SERVER: a hydrate-counter FC with a server child. A click event
    // was queued before JS shipped (simulated by pre-populating __hydrateQueue
    // with a descriptor that points to childNodes[0] of the FC). After start()
    // hydrates the FC, the queue entry must be replayed onto the freshly-rendered
    // live node that corresponds to that path.
    window.document.body.innerHTML =
      "<hydrate-counter><div>Count: 0</div></hydrate-counter>";
    const fc = window.document.body.querySelector("hydrate-counter") as Element;
    assert.ok(fc, "precondition: server FC present");

    // Track whether a click was received on the live subtree after hydration.
    let replayedClick = false;
    t.after(() => {
      window.document.body.innerHTML = "";
      (window as unknown as Record<string, unknown>).__hydrateQueue = undefined;
    });

    // Pre-populate the queue with a descriptor targeting childNodes[0] of the
    // FC (the server <div>). After hydration, start() must walk that path from
    // the freshly-rendered FC element and dispatch a new click there.
    installCaptureStub();
    (window as unknown as Record<string, unknown>).__hydrateQueue = [
      {
        unitEl: fc,
        type: "click",
        targetPath: [0],
        init: { bubbles: true, cancelable: true },
      },
    ];

    // Act — start() hydrates the FC and drains the queue for this unit.
    start(window.document.body);
    // Attach a listener on the FC to catch the replayed event. Must be set up
    // before tick() so it is present when the async drain fires.
    fc.addEventListener("click", () => {
      replayedClick = true;
    });
    await tick();

    // Assert — the queued event was re-dispatched and bubbled up to the FC.
    assert.ok(
      replayedClick,
      "start() replayed the queued click onto the live node after hydration",
    );
    // The queue entry must be consumed: the queue is empty or the entry removed.
    const queue = (window as unknown as Record<string, unknown>)
      .__hydrateQueue as Array<unknown>;
    assert.equal(
      queue.filter((e) => (e as { unitEl: Element }).unitEl === fc).length,
      0,
      "the queue entry for this unit was drained after hydration",
    );
  });

  it("an unresolved path (element no longer in the rebuilt tree) is dropped with console.warn", async (t) => {
    // Arrange — SERVER: a hydrate-counter FC. The queue holds an entry with a
    // targetPath that cannot be resolved in the rebuilt subtree (e.g., index [5]
    // when the FC renders only a single child). start() must not throw; it must
    // emit a console.warn and silently drop the entry.
    window.document.body.innerHTML =
      "<hydrate-counter><div>Count: 0</div></hydrate-counter>";
    const fc = window.document.body.querySelector("hydrate-counter") as Element;
    assert.ok(fc, "precondition: server FC present");

    let warnCalled = false;
    const originalWarn = console.warn;
    console.warn = (..._args: unknown[]) => {
      warnCalled = true;
    };
    t.after(() => {
      console.warn = originalWarn;
      window.document.body.innerHTML = "";
      (window as unknown as Record<string, unknown>).__hydrateQueue = undefined;
    });

    // Pre-populate the queue with an unresolvable targetPath: index 5 is far
    // beyond any child the FC will render (it renders a single <div>).
    installCaptureStub();
    (window as unknown as Record<string, unknown>).__hydrateQueue = [
      {
        unitEl: fc,
        type: "click",
        targetPath: [5],
        init: { bubbles: true, cancelable: true },
      },
    ];

    // Act — start() hydrates and attempts to drain the queue.
    start(window.document.body);
    await tick();

    // Assert — no throw, console.warn was called, and the entry was dropped.
    assert.ok(
      warnCalled,
      "console.warn was called for the unresolvable targetPath",
    );
    const queue = (window as unknown as Record<string, unknown>)
      .__hydrateQueue as Array<unknown>;
    assert.equal(
      queue.filter((e) => (e as { unitEl: Element }).unitEl === fc).length,
      0,
      "the unresolvable queue entry was dropped",
    );
  });
});

// M5 — Build / serving integration (SSG hydration pass)
//
// build() does not yet inject hydration artifacts; these tests define the
// acceptance criteria and are expected to fail until M5 is implemented.

// A simple FC whose render fn uses a prop so the server HTML carries attrs.
const Builder = FC<{ label: string }>("hydrate-builder", (_el, attrs) =>
  div(attrs.label ?? ""),
);
void Builder;

// An outer FC that nests Builder — used to verify defer-hydration injection
// on nested custom elements in the SSG output.
const BuilderWrapper = FC<object>("hydrate-builder-wrapper", (_el) =>
  Builder({ label: "nested" }),
);
void BuilderWrapper;

function makeMemFS(): { fs: FileSystem; files: Record<string, string> } {
  const files: Record<string, string> = {};
  const adapter = new RecordFileSystemAdapter(files);
  const fs = new FileSystem(adapter);
  return { fs, files };
}

describe("hydrate — M5: build integration", () => {
  it("build() injects the __hydration script tag when FC units have props", async () => {
    // Arrange — a page whose body contains a single FC unit with props.
    // After build() runs, the written HTML must contain a
    // <script type="application/json" id="__hydration"> element in <head>
    // whose content is the JSON-encoded props payload for that unit.
    const { fs, files } = makeMemFS();
    const label = "Hello M5";
    const page: PageModule = {
      default: () => Builder({ label }),
    };

    // Act
    await build({
      pages: [{ route: "/", module: page }],
      out: "/dist",
      fs,
    });

    const html = files["/dist/index.html"] ?? "";

    // Assert — a hydration payload script is present in the output.
    assert.ok(
      html.includes('id="__hydration"'),
      'output HTML must contain <script id="__hydration">',
    );
    assert.ok(html.includes('"label"'), "payload must include the prop key");
    assert.ok(html.includes(label), "payload must include the prop value");
  });

  it("build() adds defer-hydration to nested custom elements in the output HTML", async () => {
    // Arrange — a page whose body contains an outer FC (BuilderWrapper) that
    // renders an inner FC (Builder). The serializer must emit defer-hydration
    // on the inner custom element so client-side start() does not attempt to
    // hydrate it before the outer FC has settled.
    const { fs, files } = makeMemFS();
    const page: PageModule = {
      default: () => BuilderWrapper({}),
    };

    // Act
    await build({
      pages: [{ route: "/", module: page }],
      out: "/dist",
      fs,
    });

    const html = files["/dist/index.html"] ?? "";

    // Assert — the inner FC element carries defer-hydration in the output.
    assert.ok(
      html.includes("defer-hydration"),
      "nested custom element must carry defer-hydration attribute in SSG output",
    );
    // The outer FC must NOT carry defer-hydration — only nested ones do.
    const outerMatch = html.match(/<hydrate-builder-wrapper([^>]*)>/);
    assert.ok(outerMatch, "outer FC element must be present in output");
    assert.ok(
      !outerMatch[1].includes("defer-hydration"),
      "outer (top-level) FC must not carry defer-hydration",
    );
  });

  it("build() injects the capture stub inline script before </body>", async () => {
    // Arrange — a page with clientModules triggers the hydration pass and the
    // capture stub. A fully static page (no FC units, no clientModules) does
    // not need the stub; here we use clientModules to force the injection so
    // the test is self-contained without defining a real custom element.
    const { fs, files } = makeMemFS();
    const page: PageModule = {
      default: () => div("static"),
      clientModules: ["/app/entry.js"],
    };

    // Act
    await build({
      pages: [{ route: "/", module: page }],
      out: "/dist",
      fs,
    });

    const html = files["/dist/index.html"] ?? "";

    // Assert — an inline script appears before </body>.
    const scriptBeforeBody = html.match(
      /<script[^>]*>[\s\S]*?<\/script>\s*<\/body>/,
    );
    assert.ok(
      scriptBeforeBody,
      "an inline <script> must appear immediately before </body>",
    );
    // The stub must reference __hydrateQueue so it can capture events.
    assert.ok(
      html.includes("__hydrateQueue"),
      "capture stub script must reference __hydrateQueue",
    );
  });

  it("build() injects a deferred client-entry module script when clientModules is set", async () => {
    // Arrange — a PageModule extended with clientModules. build() must emit a
    // <script type="module" defer> that imports the listed client entry points
    // and calls start() so the client bundle hydrates the page after load.
    const { fs, files } = makeMemFS();
    const clientEntry = "/app/client.js";
    const page: PageModule & { clientModules?: string[] } = {
      default: () => div("content"),
      clientModules: [clientEntry],
    };

    // Act
    await build({
      pages: [{ route: "/", module: page as PageModule }],
      out: "/dist",
      fs,
    });

    const html = files["/dist/index.html"] ?? "";

    // Assert — a <script type="module" defer> is present that references the
    // client entry module.
    assert.ok(
      html.includes('type="module"'),
      'output HTML must contain a <script type="module">',
    );
    assert.ok(
      html.includes(clientEntry),
      "the client entry path must appear in the module script",
    );
  });
});

describe("hydrate — M6: props survive hydration", () => {
  it("hydrateRoot re-renders an FC with its server attributes as props", async (t) => {
    // Arrange — SERVER: an FC with props baked into its attributes and a stale
    // child. hydrateRoot does not read the #__hydration payload; the only source
    // of props for a kept server unit is the attributes the reconcile pass syncs
    // onto it from the freshly rendered tree.
    window.document.body.innerHTML = `<hydrate-greeter name="Ada" count="3"><div>stale</div></hydrate-greeter>`;
    t.after(() => {
      window.document.body.innerHTML = "";
    });

    // Act — reconcile the same render onto the live shell, then hydrate.
    hydrateRoot(window.document.body, () => [
      Greeter({ name: "Ada", count: 3 }),
    ]);
    await tick();

    // Assert — the re-render saw the props, not an empty object.
    const fc = window.document.body.querySelector("hydrate-greeter");
    assert.equal(
      fc?.textContent,
      "Hello Ada x3",
      "hydrateRoot passed the server attributes to the FC's update()",
    );
  });

  it("hydrateRoot carries props into a host-free FCC boundary", async (t) => {
    // Arrange — a server-rendered FCC <div data-fc> with its prop in an attribute.
    window.document.body.innerHTML = `<div data-fc="hydrate-badge" label="Live"><span>stale</span></div>`;
    t.after(() => {
      window.document.body.innerHTML = "";
    });

    // Act
    hydrateRoot(window.document.body, () => [Badge({ label: "Live" })]);
    await tick();

    // Assert — the FCC re-rendered from its server attribute, not empty props.
    const badge = window.document.body.querySelector(
      "[data-fc='hydrate-badge']",
    );
    assert.equal(
      badge?.querySelector("span")?.textContent,
      "[Live]",
      "hydrateRoot passed the server attribute to the FCC's update()",
    );
  });

  it("start() gives each top-level unit its own payload entry across a nested unit", async (t) => {
    // Arrange — the server builds the payload from a DESCENDING scan, so a nested
    // unit's props sit between the two top-level units in document order.
    const script = window.document.createElement("script");
    script.type = "application/json";
    script.id = "__hydration";
    script.textContent = buildPayload([
      { who: "A" }, // hydrate-panel (top-level)
      { label: "nested" }, // hydrate-badge inside the panel
      { label: "B" }, // hydrate-badge (top-level)
    ]);
    window.document.head.appendChild(script);

    const container = window.document.createElement("div");
    container.innerHTML =
      `<hydrate-panel who="A"><div><div data-fc="hydrate-badge"><span>x</span></div></div></hydrate-panel>` +
      `<div data-fc="hydrate-badge"><span>y</span></div>`;
    window.document.body.append(container);
    t.after(() => {
      script.remove();
      container.remove();
    });

    // Act
    start(container);
    await tick();

    // Assert — the second top-level unit got payload[2] ("B"), not the nested
    // unit's payload[1] ("nested").
    const topBadge = container.children[1];
    assert.equal(
      topBadge.querySelector("span")?.textContent,
      "[B]",
      "top-level badge hydrated from its own payload entry across the nested unit",
    );
  });
});
