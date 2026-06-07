import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// ----------------------------------------------------------------------------
// Real-origin DOM environment — the same setup the interceptor feature test uses
// (see interceptor.test.ts for the full rationale). The fallback interceptor
// resolves anchor hrefs, decides same-origin against location.origin, and calls
// history.pushState, none of which jsdom's default about:blank window supports.
// So this suite boots its own real-URL window and installs it as the global
// BEFORE importing the runtime, so the registry, hydration, and runtime share it.
//
// node:test runs each test file in its own process, so the module-level state in
// ./index.ts (firstLoadContext, the callback queues, the installed listeners) is
// isolated to this file. bootstrap() therefore runs exactly once here, in the
// `before` hook, mirroring production: one document load installs one interceptor.
// ----------------------------------------------------------------------------
const jsdom = new JSDOM(
  `<!doctype html><html lang="en"><head></head><body></body></html>`,
  { url: "https://example.test/a" },
);
const g = globalThis as unknown as Record<string, unknown>;
g.window = jsdom.window;
g.HTMLElement = jsdom.window.HTMLElement;
g.customElements = jsdom.window.customElements;
g.Event = jsdom.window.Event;
g.MouseEvent = jsdom.window.MouseEvent;
g.Element = jsdom.window.Element;
g.PopStateEvent = jsdom.window.PopStateEvent;
g.DOMParser = jsdom.window.DOMParser;

import { before, describe, it } from "node:test";
import { bootstrap, onFirstLoad } from "./index.ts";

describe("route hydration — remaining M1 unit tests", () => {
  // One bootstrap for the whole file: hydrates the (empty) initial body, retains
  // the first-load context, and installs the interceptor. Subsequent tests
  // observe the already-bootstrapped runtime, exactly as later navigations would.
  before(async () => {
    window.document.title = "Page A";
    await bootstrap();
  });

  describe("onFirstLoad registered after first load (design §1)", () => {
    it("fires immediately with the retained first-load context", () => {
      // Arrange — bootstrap already ran in the before hook, so firstLoadContext
      // is set. A shell module importing the runtime lazily registers here, after
      // the initial event has passed.
      let calls = 0;
      let ctx: { url: URL; title: string; type: string } | undefined;

      // Act — register the late hook.
      onFirstLoad((received) => {
        calls += 1;
        ctx = received;
      });

      // Assert — it ran synchronously, against the retained context, so a late
      // registration never drops the initial event.
      assert.equal(
        calls,
        1,
        "a late onFirstLoad fires immediately, exactly once",
      );
      assert.equal(ctx?.type, "first", "retained context type is 'first'");
      assert.equal(
        ctx?.url.href,
        "https://example.test/a",
        "retained context carries the initial page URL",
      );
      assert.equal(
        ctx?.title,
        "Page A",
        "retained context carries the initial title",
      );
    });
  });
});
