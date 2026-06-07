import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// ----------------------------------------------------------------------------
// Real-origin DOM environment + Navigation API stub.
//
// The Navigation API is the sole interception mechanism (design §2/§8): the
// runtime registers ONE `navigate` listener that fires for every same-document
// candidate (link click, programmatic nav, back/forward) and claims it via
// `event.intercept`. jsdom ships neither a real origin nor the Navigation API, so
// this suite supplies both:
//
//   * a real-URL window (https://example.test/a) — the core builds absolute URLs
//     from `window.location.href` and the destination is resolved from the
//     clicked anchor's href, which about:blank cannot base; and
//   * a minimal `window.navigation` stub recording the `navigate` listener, so the
//     test can emit the navigate event a real browser would synthesise from the
//     link click (jsdom does not), then run the handler the browser would await.
//
// Both are installed as globals BEFORE importing `../fc.ts` (whose evaluation
// triggers dom.ts's windowless bootstrap) and BEFORE `FC(...)` defines the island,
// so the registry, hydration, and runtime all share this one window.
// ----------------------------------------------------------------------------
const jsdom = new JSDOM(
  `<!doctype html><html lang="en"><head></head><body></body></html>`,
  { url: "https://example.test/a" },
);

// Minimal Navigation API stub. The runtime only ever calls
// `navigation.addEventListener("navigate", listener)`; record those listeners so
// the test can drive them. `emitNavigate` below plays the browser's role.
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
// The route-hydration runtime. `bootstrap` and `onFirstLoad` do NOT exist yet:
// the remaining-M1 step adds the auto-bootstrap entry (hydrate the initial page +
// install the interceptor + fire `onFirstLoad`) and the Navigation API navigate
// listener. Until then this named import is unresolved and the whole suite fails
// to load — the required initial red.
import { bootstrap, onFirstLoad, onNavigate } from "./index.ts";

// `start()` schedules each unit's hydration on a `customElements.whenDefined`
// microtask, so a parsed-but-not-yet-hydrated island settles one task later.
// Flush a macrotask before asserting on hydrated DOM, exactly as hydrate.test.ts.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Play the browser's role: emit the `navigate` event it would synthesise for a
 * same-origin in-app navigation to `url`, and return the handler the runtime
 * registered through `event.intercept` (undefined if the runtime declined). The
 * caller awaits the handler exactly as the browser awaits the intercept promise.
 */
function emitNavigate(url: string): (() => void | Promise<void>) | undefined {
  let interceptHandler: (() => void | Promise<void>) | undefined;
  const event = {
    canIntercept: true,
    hashChange: false,
    downloadRequest: null,
    formData: null,
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

// The interactive island both pages render, defined once at module load (the
// `customElements.define` side effect of `FC(...)`) — a shared client chunk
// already in the ES module cache for the session. Its text proves hydration
// happened: the rendered child responds to a click by incrementing a counter, so
// SSR markup ("Hello X (0)") that merely looks right is distinguished from a live
// hydrated island ("Hello X (1)" after a click). NOTE: this `FC(...)` runs in
// top-level code, AFTER the global-window reassignment above, so it defines into
// the real-URL window's registry.
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
// Reference the binding so the top-level `FC(...)` define is not flagged unused;
// the test drives the element through the DOM, not this constructor.
void Greeting;

// The destination page's already-built standalone HTML — the exact shape
// `build()` emits. It carries a `data-shell` one-time node (preserved by the head
// reconciler), per-page metadata that replaces page A's, the destination
// `#__hydration` payload, and a deferred module script whose inline
// `import "<spec>";` the runtime must extract and `import()`. The spec is a real
// data: URL module whose body records its own execution, proving the interceptor
// drove the FULL same-document core (not a partial path) including module import.
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

describe("route hydration — remaining M1: auto-bootstrap + navigation interception", () => {
  it("hydrates the first page and fires onFirstLoad, then intercepts an in-app navigation as a same-document transition (no full load)", async (t) => {
    const doc = window.document;
    const win = globalThis as unknown as Record<string, unknown>;

    // Arrange — FIRST LOAD on page A, as the browser delivers it: a built, NOT
    // yet hydrated document. A one-time `data-shell` theme node in <head>,
    // per-page metadata, page A's `__hydration` payload, an in-app link to /b,
    // and page A's island (SSR markup only — no live handlers yet).
    doc.documentElement.lang = "en";
    doc.head.innerHTML = `
<script data-shell id="theme-once">document.documentElement.dataset.theme="dawn"</script>
<title>Page A</title>
<meta name="description" content="The home page">
<script type="application/json" id="__hydration">${buildPayload([{ name: "A-home" }])}</script>`;
    doc.body.innerHTML = `
<a id="to-b" href="/b">About</a>
<route-greeting><div>Hello A-home (0)</div></route-greeting>`;

    // Capture the live one-time node by identity. The run-once guarantee is that
    // this object is never removed, re-inserted, or replaced across navigations —
    // what keeps the theme from flipping and analytics from re-bootstrapping.
    const shellNode = doc.head.querySelector("[data-shell]");
    assert.ok(shellNode, "precondition: the one-time shell node is in <head>");

    // Stub the network: any fetch returns page B's built HTML. Record the URL so
    // we can assert the interceptor fetched the destination.
    const originalFetch = globalThis.fetch;
    let fetchedUrl: string | undefined;
    globalThis.fetch = ((input: unknown) => {
      fetchedUrl = String(input);
      return Promise.resolve(
        new Response(PAGE_B_HTML, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );
    }) as typeof fetch;

    // Observe the lifecycle hooks the shell uses. `onFirstLoad` is the once-on-
    // boot hook (e.g. an initial analytics pageview); `onNavigate` fires per
    // in-app navigation. Registered BEFORE bootstrap so the first-load event is
    // not dropped (design §1).
    let firstLoads = 0;
    let firstCtx: { url: URL; title: string; type: string } | undefined;
    onFirstLoad((ctx) => {
      firstLoads += 1;
      firstCtx = ctx;
    });

    let navigations = 0;
    let navCtx: { url: URL; title: string } | undefined;
    onNavigate((ctx) => {
      navigations += 1;
      navCtx = ctx;
    });

    t.after(() => {
      globalThis.fetch = originalFetch;
      win.__pageBModuleRan = undefined;
      win.__hydrateQueue = undefined;
    });

    // Act 1 — the site loads. The runtime bootstraps: hydrate the initial page,
    // install the Navigation API `navigate` listener, and fire `onFirstLoad`.
    await bootstrap();
    await tick();

    // Assert — BOOTSTRAP HYDRATED PAGE A. Its SSR text already reads
    // "Hello A-home (0)"; clicking proves a live handler is wired, i.e. bootstrap
    // actually called start() on the initial document rather than leaving it inert.
    const pageAIsland = doc.querySelector("route-greeting") as FCComponent<
      GreetingProps,
      GreetingState
    > | null;
    assert.ok(pageAIsland, "precondition: page A island present");
    const pageAChild = pageAIsland.querySelector("div") as HTMLElement;
    assert.ok(pageAChild, "page A island rendered its child");
    pageAChild.click();
    assert.equal(
      pageAIsland.textContent,
      "Hello A-home (1)",
      "bootstrap hydrated the initial page — its island responds to input",
    );

    // Assert — onFirstLoad fired exactly once with the initial page's context.
    assert.equal(firstLoads, 1, "onFirstLoad fired exactly once on bootstrap");
    assert.equal(firstCtx?.type, "first", "first-load context type is 'first'");
    assert.equal(
      firstCtx?.url.href,
      "https://example.test/a",
      "first-load context carries the initial page URL",
    );
    assert.equal(
      firstCtx?.title,
      "Page A",
      "first-load context carries the initial page title",
    );

    // Act 2 — the visitor clicks the in-app link to /b. A real browser turns that
    // click into a `navigate` event on `window.navigation`; jsdom does not, so the
    // suite emits it for the link's resolved href. The interceptor must CLAIM it
    // (call `event.intercept`), which is what cancels the browser's full-page load.
    const link = doc.getElementById("to-b") as HTMLAnchorElement | null;
    assert.ok(link, "page A renders an in-app link to the destination");
    const destination = new URL(
      link.getAttribute("href") ?? "",
      window.location.href,
    ).href;
    const interceptHandler = emitNavigate(destination);
    assert.ok(
      interceptHandler,
      "the interceptor claimed the navigation via event.intercept (no full load)",
    );

    // The same-document core runs inside the intercept handler (fetch → reconcile
    // <head> → swap <body> → import module → start() → onNavigate). The browser
    // awaits this promise; so does the test. Then flush hydration microtasks.
    await interceptHandler();
    await tick();

    // Assert — the interceptor drove the shared core: it fetched the destination.
    assert.ok(
      fetchedUrl?.endsWith("/b"),
      `the interceptor fetched the destination page (got ${fetchedUrl})`,
    );

    // Assert — RUN-ONCE: the one-time shell node survived untouched (same object,
    // still the only [data-shell] node), so its inline theme/analytics never re-ran.
    assert.equal(
      doc.head.querySelectorAll("[data-shell]").length,
      1,
      "exactly one shell node remains; the destination's copy was not added",
    );
    assert.strictEqual(
      doc.head.querySelector("[data-shell]"),
      shellNode,
      "the live shell node was preserved by identity, not replaced",
    );

    // Assert — NAVIGATION CORRECTNESS: per-page metadata is now page B's.
    assert.equal(
      doc.title,
      "Page B",
      "document.title updated to the destination",
    );
    assert.equal(
      doc.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
      "The about page",
      "per-page <meta description> was replaced with the destination's",
    );

    // Assert — the destination's page module was imported (full core ran via the
    // interceptor, not just a partial head/body path).
    assert.equal(
      win.__pageBModuleRan,
      true,
      'the destination\'s `import "<spec>";` was extracted and imported',
    );

    // Assert — BODY SWAP + HYDRATION: page A's island is gone; page B's island is
    // present, hydrated with page B's payload (destination `__hydration` applied
    // before start()), and responds to input on the swapped-in node.
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
      "clicking the destination island runs its live handler",
    );

    // Assert — the navigation was reported exactly once, with the destination URL
    // and title, so shell hooks (e.g. a GA pageview) fire per navigation.
    assert.equal(navigations, 1, "onNavigate fired exactly once for the click");
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
