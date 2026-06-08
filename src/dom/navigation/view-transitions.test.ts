import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// ----------------------------------------------------------------------------
// Real-origin DOM environment + Navigation API stub + View Transitions stub.
//
// This is the M2 feature test: an in-app navigation should swap the body inside
// a same-document View Transition (design §2 step 4), so the destination appears
// through one browser-animated transition instead of an abrupt replacement.
//
// The View Transition guard reads `event.hasUAVisualTransition`, a field of the
// NavigateEvent — so the runtime can only see it on the interception path. This
// test therefore drives the FULL realistic path (bootstrap installs the
// Navigation API listener; the browser emits a navigate event for the clicked
// link; the interceptor claims it), exactly like interceptor.test.ts, rather than
// calling the core `navigate(url)` directly.
//
// jsdom ships neither a real origin, the Navigation API, nor
// `document.startViewTransition`, so this suite supplies all three. Globals are
// installed BEFORE importing ../fc.ts (whose evaluation triggers dom.ts's
// windowless bootstrap) and BEFORE FC(...) defines the island, so the registry,
// hydration, and runtime all share this one window. node:test runs each file in
// its own process, so ./index.ts's module state (the callback queues, the
// installed listener) is isolated here.
//
// NOTE (refactor, not feature): this is the THIRD Navigation-API suite to stand
// up this same real-origin window + navigation stub + emitNavigate harness
// (after interceptor.test.ts and interceptor.unit.test.ts). That is the
// Three-Strikes trigger recorded in refactor-plan-remaining-m1.md "Deferred" —
// the planning/refactor step for M2 should extract a shared interceptor.testenv.ts
// and adopt it across all three. The feature-test phase only writes this test, so
// the harness is duplicated here for now.
// ----------------------------------------------------------------------------
const jsdom = new JSDOM(
  `<!doctype html><html lang="en"><head></head><body></body></html>`,
  { url: "https://example.test/a" },
);

const navigateListeners: Array<(event: NavigateEvent) => void> = [];
const navigationStub = {
  addEventListener(type: string, listener: (event: NavigateEvent) => void) {
    if (type === "navigate") navigateListeners.push(listener);
  },
};

const g = globalThis as unknown as Record<string, unknown>;
g.window = jsdom.window;
g.HTMLElement = jsdom.window.HTMLElement;
g.customElements = jsdom.window.customElements;
g.Event = jsdom.window.Event;
g.MouseEvent = jsdom.window.MouseEvent;
g.Element = jsdom.window.Element;
g.DOMParser = jsdom.window.DOMParser;
(jsdom.window as unknown as Record<string, unknown>).navigation =
  navigationStub;

import { describe, it } from "node:test";
import { FC, type FCComponent, State } from "../fc.ts";
import { div } from "../html.ts";
import { buildPayload } from "../hydrate.ts";
import { bootstrap, onNavigate } from "./index.ts";

// `start()` schedules each unit's hydration on a `customElements.whenDefined`
// microtask, so a parsed-but-not-yet-hydrated island settles one task later.
// Flush a macrotask before asserting on hydrated DOM, exactly as hydrate.test.ts.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Play the browser's role: emit the `navigate` event it would synthesise for an
 * in-app navigation to `url`, and return the handler the runtime registered via
 * `event.intercept` (undefined if it declined). The caller awaits the handler as
 * the browser awaits the intercept promise.
 *
 * Extends interceptor.test.ts's helper with the two View-Transition-relevant
 * fields: `hasUAVisualTransition` (true when the browser ALREADY ran a visual
 * transition for this navigation — e.g. a cross- to same-document hand-off — so
 * the runtime must NOT start a second one) and `navigationType` (the entry kind).
 */
function emitNavigate(
  url: string,
  fields: {
    hasUAVisualTransition?: boolean;
    navigationType?: "push" | "replace" | "traverse" | "reload";
  } = {},
): (() => void | Promise<void>) | undefined {
  let interceptHandler: (() => void | Promise<void>) | undefined;
  const event = {
    canIntercept: true,
    hashChange: false,
    downloadRequest: null,
    formData: null,
    hasUAVisualTransition: fields.hasUAVisualTransition ?? false,
    navigationType: fields.navigationType ?? "push",
    destination: { url },
    intercept(options: { handler: () => void | Promise<void> }) {
      interceptHandler = options.handler;
    },
  } as unknown as NavigateEvent;
  for (const listener of navigateListeners) listener(event);
  return interceptHandler;
}

interface GreetingProps {
  name: string;
}
interface GreetingState {
  count: number;
}

// The interactive island both pages render, defined once at module load. Its
// text proves hydration happened: the rendered child responds to a click by
// incrementing a counter, so SSR markup ("Hello X (0)") that merely looks right
// is distinguished from a live hydrated island ("Hello X (1)" after a click).
const Greeting = FC<GreetingProps, GreetingState>(
  "route-greeting",
  (el, attrs) => {
    const state = el[State] as GreetingState;
    state.count ??= 0;
    const name = attrs.name ?? "?";
    const view = div(`Hello ${name} (${state.count})`);
    view.update({
      events: {
        click: () => {
          state.count += 1;
          view.update(`Hello ${name} (${state.count})`);
        },
      },
    });
    return view;
  },
);
// Reference the binding so the top-level FC(...) define is not flagged unused.
void Greeting;

// The destination page's already-built standalone HTML — the shape `build()`
// emits: a `data-shell` one-time node (preserved by the head reconciler),
// per-page metadata replacing page A's, the destination `#__hydration` payload,
// and a deferred module script whose inline `import "<spec>";` the runtime
// extracts and imports.
const PAGE_B_HTML = `<!doctype html>
<html lang="en">
<head>
<script data-shell id="theme-once">document.documentElement.dataset.theme="dawn"</script>
<title>Page B</title>
<meta name="description" content="The about page">
<script type="application/json" id="__hydration">${buildPayload([{ name: "B-about" }])}</script>
</head>
<body>
<route-greeting><div>Hello B-about (0)</div></route-greeting>
<script type="module">import "data:text/javascript,globalThis.__pageBModuleRan=true";</script>
</body>
</html>`;

describe("route hydration — M2: View Transitions on same-document navigation", () => {
  it("wraps the body swap in document.startViewTransition, so the destination renders inside one animated transition (and still hydrates correctly)", async (t) => {
    const doc = window.document;
    const win = globalThis as unknown as Record<string, unknown>;

    // Arrange — FIRST LOAD on page A, as the browser delivers it: a built, not
    // yet hydrated document with a one-time `data-shell` theme node, per-page
    // metadata + payload, an in-app link to /b, and page A's island.
    doc.documentElement.lang = "en";
    doc.head.innerHTML = `
<script data-shell id="theme-once">document.documentElement.dataset.theme="dawn"</script>
<title>Page A</title>
<meta name="description" content="The home page">
<script type="application/json" id="__hydration">${buildPayload([{ name: "A-home" }])}</script>`;
    doc.body.innerHTML = `
<a id="to-b" href="/b">About</a>
<route-greeting><div>Hello A-home (0)</div></route-greeting>`;

    // The run-once shell node, captured by identity — it must survive untouched
    // across the navigation (the View Transition must not disturb it).
    const shellNode = doc.head.querySelector("[data-shell]");
    assert.ok(shellNode, "precondition: the one-time shell node is in <head>");

    // Stub the network: any fetch returns page B's built HTML.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(PAGE_B_HTML, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      )) as typeof fetch;

    // Stub document.startViewTransition. A real browser snapshots the current
    // DOM, runs the callback to mutate it, then animates between the before/after
    // snapshots. The stub records each call and the body content at the instant
    // it is invoked — BEFORE running the callback — then runs the callback and
    // resolves the ViewTransition promises. Capturing the pre-callback body lets
    // the test prove the swap happens INSIDE the transition callback, not eagerly
    // before it. Resolving all three promises means the assertion holds whichever
    // one the runtime chooses to await.
    let vtCalls = 0;
    let bodyAtTransitionStart: string | undefined;
    const docWithVT = doc as unknown as {
      startViewTransition?: (cb: () => unknown) => unknown;
    };
    const originalStartViewTransition = docWithVT.startViewTransition;
    docWithVT.startViewTransition = (cb: () => unknown) => {
      vtCalls += 1;
      bodyAtTransitionStart = doc.body.innerHTML;
      const updateCallbackDone = Promise.resolve(cb());
      return {
        updateCallbackDone,
        ready: Promise.resolve(undefined),
        finished: updateCallbackDone,
        skipTransition() {},
      };
    };

    let navigations = 0;
    let navCtx: { url: URL; title: string; type: string } | undefined;
    onNavigate((ctx) => {
      navigations += 1;
      navCtx = ctx;
    });

    t.after(() => {
      globalThis.fetch = originalFetch;
      // Restore the stub. jsdom has no startViewTransition, so the original is
      // undefined; delete rather than assign undefined (exactOptionalPropertyTypes).
      if (originalStartViewTransition) {
        docWithVT.startViewTransition = originalStartViewTransition;
      } else {
        delete docWithVT.startViewTransition;
      }
      win.__pageBModuleRan = undefined;
      win.__hydrateQueue = undefined;
    });

    // Act 1 — the site loads: bootstrap hydrates page A and installs the
    // Navigation API interceptor.
    await bootstrap();
    await tick();
    const pageAIsland = doc.querySelector("route-greeting") as FCComponent<
      GreetingProps,
      GreetingState
    > | null;
    assert.ok(
      pageAIsland,
      "precondition: page A island present after bootstrap",
    );

    // Act 2 — the visitor clicks the in-app link. The browser emits a navigate
    // event with `hasUAVisualTransition: false` (it did NOT animate this one
    // itself), so the runtime owns the transition. The interceptor claims it.
    const link = doc.getElementById("to-b") as HTMLAnchorElement | null;
    assert.ok(link, "page A renders an in-app link to the destination");
    const destination = new URL(
      link.getAttribute("href") ?? "",
      window.location.href,
    ).href;
    const interceptHandler = emitNavigate(destination, {
      hasUAVisualTransition: false,
      navigationType: "push",
    });
    assert.ok(
      interceptHandler,
      "the interceptor claimed the navigation via event.intercept",
    );
    await interceptHandler();
    await tick();

    // Assert — THE HEADLINE: the swap ran through one View Transition.
    assert.equal(
      vtCalls,
      1,
      "document.startViewTransition wrapped the body swap exactly once",
    );

    // Assert — the swap happened INSIDE the transition callback: at the instant
    // the transition began, page A's body was still live; only running the
    // callback swapped in page B. This is what lets the browser animate between
    // the old and new states. (Proves the swap is deferred into the callback,
    // not applied eagerly before startViewTransition.)
    assert.match(
      bodyAtTransitionStart ?? "",
      /Hello A-home/,
      "page A body was still live when the transition began — swap deferred into the callback",
    );

    // Assert — OUTCOME unchanged from a direct swap: the destination rendered,
    // its per-page metadata is applied, its island hydrated and is interactive,
    // and the run-once shell node survived the transition untouched.
    assert.equal(
      doc.title,
      "Page B",
      "document.title updated to the destination",
    );
    assert.strictEqual(
      doc.head.querySelector("[data-shell]"),
      shellNode,
      "the run-once shell node was preserved by identity across the transition",
    );

    const islands = doc.body.querySelectorAll("route-greeting");
    assert.equal(islands.length, 1, "exactly one island after the swap");
    const island = islands[0] as FCComponent<GreetingProps, GreetingState>;
    assert.notStrictEqual(
      island,
      pageAIsland,
      "the body was swapped, not patched in place",
    );
    assert.equal(
      island.textContent,
      "Hello B-about (0)",
      "destination island hydrated with the destination payload",
    );
    const child = island.querySelector("div") as HTMLElement;
    assert.ok(child, "hydrated destination island rendered its child");
    child.click();
    assert.equal(
      island.textContent,
      "Hello B-about (1)",
      "destination island is interactive after the transition — hydration ran post-swap",
    );

    // Assert — the navigation was reported exactly once, with the destination
    // URL and title (the View Transition does not double- or drop-fire the hook).
    assert.equal(navigations, 1, "onNavigate fired exactly once");
    assert.equal(
      navCtx?.title,
      "Page B",
      "onNavigate context carries the new title",
    );
    assert.equal(
      navCtx?.url.href,
      "https://example.test/b",
      "onNavigate context carries the destination URL",
    );
  });
});
