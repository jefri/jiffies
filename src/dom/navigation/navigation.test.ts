import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type FCComponent, FC, State } from "../fc.ts";
import { div } from "../html.ts";
import { buildPayload, start } from "../hydrate.ts";
// The route-hydration runtime. Importing it does not exist yet, so this whole
// file fails to load until M1 ships `src/dom/navigation/`. `navigate(url)` is
// the same-document core (design §2 steps 1-7) that both the Navigation API
// interceptor and the click/popstate fallback (§8) drive; the feature test
// exercises it directly because jsdom has no Navigation API to dispatch through.
import { navigate, onNavigate } from "./index.ts";

// `start()` schedules each unit's hydration on a `customElements.whenDefined`
// microtask, so a parsed-but-not-yet-hydrated island settles one task later.
// Flush a macrotask before asserting on hydrated DOM, exactly as hydrate.test.ts.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

interface GreetingProps {
  name: string;
}
interface GreetingState {
  count: number;
}

// The interactive island both pages render. It is defined once at module load
// (the `customElements.define` side effect of `FC(...)`), modelling a shared
// client chunk that is already in the ES module cache for the whole session —
// the common case the design optimizes for ("re-importing them is a no-op").
// Its render echoes the `name` it hydrates with and increments a click counter,
// so its text proves three things at once after a navigation: the body was
// swapped, the destination `__hydration` payload was applied before `start()`,
// and the live (not server) handler is wired.
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
// Reference the binding so the top-level `FC(...)` (the define that makes
// <route-greeting> resolvable) is not flagged unused; the test drives the
// element through the DOM, not this constructor.
void Greeting;

// The destination page's already-built, standalone HTML document — the exact
// shape `build()` emits (doctype + html + head + body). It carries:
//   - a `data-shell` one-time node, identical in role to the live page's, that
//     the head reconciler must PRESERVE in place (never re-insert / re-run);
//   - per-page metadata (<title>, <meta name=description>) that REPLACES the
//     live page's;
//   - the destination's `#__hydration` payload (props for its island);
//   - a deferred module script whose inline `import "<spec>";` the runtime must
//     extract and `import()`. The spec is a real data: URL module whose body
//     records its own execution, so the test can prove step 5 actually ran.
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

describe("route hydration — M1: same-document navigation between two built pages", () => {
  it("fetches the destination, preserves the one-time shell head node, swaps body + metadata, imports the page module, and hydrates the destination island", async (t) => {
    const doc = window.document;
    const win = globalThis as unknown as Record<string, unknown>;

    // Arrange — FIRST LOAD on page A (the "home" page). Its built document is
    // live: a one-time `data-shell` theme node in <head>, per-page metadata,
    // page A's `__hydration` payload, and page A's island in <body>. Calling
    // start() once models the page hydrating after its JS shipped.
    doc.documentElement.lang = "en";
    doc.head.innerHTML = `
<script data-shell id="theme-once">document.documentElement.dataset.theme="dawn"</script>
<title>Page A</title>
<meta name="description" content="The home page">
<script type="application/json" id="__hydration">${buildPayload([{ name: "A-home" }])}</script>`;
    doc.body.innerHTML = `<route-greeting><div>Hello A-home (0)</div></route-greeting>`;
    start(doc.body);
    await tick();

    // Precondition — page A is hydrated and showing its own props/title.
    assert.equal(doc.title, "Page A", "precondition: page A title is live");
    const pageAIsland = doc.body.querySelector("route-greeting");
    assert.ok(pageAIsland, "precondition: page A island present");
    assert.equal(
      pageAIsland.textContent,
      "Hello A-home (0)",
      "precondition: page A island hydrated with its own payload",
    );

    // Capture the live one-time node by identity. The run-once guarantee is
    // exactly that this node object is never removed, re-inserted, or replaced
    // by the destination's equivalent — preserving the node is what keeps the
    // theme from flipping and the analytics bootstrap from re-running.
    const shellNode = doc.head.querySelector("[data-shell]");
    assert.ok(shellNode, "precondition: the one-time shell node is in <head>");

    // Stub the network: any fetch returns page B's built HTML. Record the URL
    // so we can assert the runtime fetched the destination.
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

    // The runtime parses fetched HTML with DOMParser. In a browser that is a
    // global; jsdom exposes it on `window`. Shim the global so a global-using
    // implementation resolves it, mirroring how dom.ts hoists DOM globals.
    const originalDOMParser = (win as { DOMParser?: unknown }).DOMParser;
    (win as { DOMParser?: unknown }).DOMParser ??= (
      window as unknown as { DOMParser: unknown }
    ).DOMParser;

    // Observe the navigation lifecycle hook the shell uses (e.g. a GA pageview).
    let navigations = 0;
    let lastCtx: { url: URL; title: string } | undefined;
    onNavigate((ctx) => {
      navigations += 1;
      lastCtx = ctx;
    });

    t.after(() => {
      globalThis.fetch = originalFetch;
      (win as { DOMParser?: unknown }).DOMParser = originalDOMParser;
      win.__pageBModuleRan = undefined;
      win.__hydrateQueue = undefined;
      doc.head.innerHTML = "";
      doc.body.innerHTML = "";
    });

    // Act — the visitor follows an in-app link to page B. Drive the shared
    // same-document core directly (the seam click/popstate/Navigation API all
    // funnel into): fetch → reconcile <head> → swap <body> → import module →
    // start() → fire onNavigate.
    await navigate("https://example.test/b");
    await tick();

    // Assert — the destination's HTML was fetched.
    assert.ok(
      fetchedUrl?.endsWith("/b"),
      `runtime fetched the destination page (got ${fetchedUrl})`,
    );

    // Assert — RUN-ONCE: the one-time shell node survived untouched. It is the
    // same object, still the only [data-shell] node (page B's equivalent was
    // not appended), so a real inline theme/analytics script in it never re-ran.
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

    // Assert — the page module was imported: its data: URL module body ran.
    assert.equal(
      win.__pageBModuleRan,
      true,
      'the destination\'s `import "<spec>";` was extracted and imported',
    );

    // Assert — BODY SWAP + HYDRATION: page A's island is gone, page B's island
    // is present and hydrated with page B's payload (proving the destination
    // `__hydration` was swapped in before start() ran).
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

    // Assert — INTERACTIVITY: the destination island responds to input, so the
    // live (not server) handler is wired on the swapped-in node.
    const child = island.querySelector("div") as HTMLElement;
    assert.ok(child, "hydrated island rendered its child");
    child.click();
    assert.equal(
      island.textContent,
      "Hello B-about (1)",
      "clicking the destination island runs its live handler",
    );

    // Assert — the navigation was reported exactly once, with the destination
    // URL and title, so shell hooks (analytics pageview) fire per navigation.
    assert.equal(
      navigations,
      1,
      "onNavigate fired exactly once for the navigation",
    );
    assert.equal(
      lastCtx?.title,
      "Page B",
      "onNavigate context carries the new title",
    );
    assert.equal(
      lastCtx?.url.href,
      "https://example.test/b",
      "onNavigate context carries the destination URL",
    );
  });
});
