import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// ----------------------------------------------------------------------------
// Real-origin DOM environment + Navigation API stub — the same shape the
// interceptor feature test uses (see interceptor.test.ts for the full rationale).
// The Navigation API is the sole interception mechanism; jsdom has neither it nor
// a real origin, so this suite boots a real-URL window and a minimal
// `window.navigation` stub that records the `navigate` listener. `emitNavigate`
// then plays the browser, dispatching a navigate event so the tests can pin which
// navigations the interceptor claims and which it declines.
//
// node:test runs each test file in its own process, so the module-level state in
// ./index.ts (firstLoadContext, the callback queues, the installed listener) is
// isolated to this file. bootstrap() therefore runs exactly once here, in the
// `before` hook, mirroring production: one document load installs one interceptor.
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
g.DOMParser = jsdom.window.DOMParser;
(jsdom.window as unknown as Record<string, unknown>).navigation =
  navigationStub;

import { before, describe, it } from "node:test";
import { bootstrap, navigate, onFirstLoad, onNavigate } from "./index.ts";

/**
 * Play the browser: dispatch the `navigate` event it would synthesise, with the
 * decline-relevant fields overridable, and report whether the interceptor claimed
 * it (called `event.intercept`). The captured handler is never invoked, so a
 * claimed event runs no core and mutates no shared state — these tests assert only
 * the claim/decline decision.
 */
function emitNavigate(fields: {
  canIntercept?: boolean;
  hashChange?: boolean;
  downloadRequest?: string | null;
  formData?: FormData | null;
}): boolean {
  let claimed = false;
  const event = {
    canIntercept: fields.canIntercept ?? true,
    hashChange: fields.hashChange ?? false,
    downloadRequest: fields.downloadRequest ?? null,
    formData: fields.formData ?? null,
    destination: { url: "https://example.test/b" },
    intercept() {
      claimed = true;
    },
  } as unknown as NavigateEvent;
  for (const listener of navigateListeners) listener(event);
  return claimed;
}

/**
 * Drive `navigate("/b")` against a failing `fetch` and report the full-load
 * fallback's observable effects: the URLs passed to `location.assign` and whether
 * `onNavigate` fired.
 *
 * jsdom's real `location.assign` is an own, non-configurable, non-writable method
 * that cannot be spied. But on the failure path `navigate()` aborts before any DOM
 * work — it touches only `window.location.href`, `window.location.assign`, and the
 * global `fetch` — so the helper swaps the global `window` for a minimal stub whose
 * `location.assign` records its argument, then restores it. The runtime reads the
 * global `window` at call time, so the swap is transparent.
 */
async function runFailingNavigate(
  fetchImpl: () => Promise<Response>,
): Promise<{ assigned: string[]; navigations: number }> {
  const realWindow = g.window;
  const assigned: string[] = [];
  g.window = {
    location: {
      href: "https://example.test/a",
      assign: (url: string | URL) => {
        assigned.push(String(url));
      },
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl as typeof fetch;

  let navigations = 0;
  onNavigate(() => {
    navigations += 1;
  });

  try {
    await navigate("/b");
  } finally {
    globalThis.fetch = originalFetch;
    g.window = realWindow;
  }
  return { assigned, navigations };
}

describe("route hydration — remaining M1 unit tests", () => {
  // One bootstrap for the whole file: hydrates the (empty) initial body, retains
  // the first-load context, and installs the navigate listener. Subsequent tests
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

  describe("navigate decline checks (design §2)", () => {
    // Positive control: a plain interceptable same-document navigation is claimed.
    // Each decline below sets exactly one field and asserts the opposite, so a
    // removed guard surfaces as a claimed navigation that should have been declined.
    it("claims a plain interceptable same-document navigation", () => {
      assert.equal(
        emitNavigate({}),
        true,
        "an interceptable, non-hash, non-download, non-form navigation is claimed",
      );
    });

    it("declines when the API cannot intercept (cross-origin, etc.)", () => {
      assert.equal(
        emitNavigate({ canIntercept: false }),
        false,
        "a non-interceptable navigation is left to the browser",
      );
    });

    it("declines a hash-only change within the document", () => {
      assert.equal(
        emitNavigate({ hashChange: true }),
        false,
        "a hash-only change is left to the browser to scroll",
      );
    });

    it("declines a download navigation", () => {
      assert.equal(
        emitNavigate({ downloadRequest: "report.pdf" }),
        false,
        "a download navigation is left to the browser",
      );
    });

    it("declines a form submission (non-GET)", () => {
      assert.equal(
        emitNavigate({ formData: {} as FormData }),
        false,
        "a form submission is left to the browser (forms are out of scope)",
      );
    });
  });

  describe("fetch-failure full-load fallback (design 'Failure modes')", () => {
    // On a non-2xx response or a network error the same-document path is abandoned:
    // location.assign(url) performs a normal full load and the core does not run
    // (no reconcile, no body swap, no onNavigate) — never a broken intermediate.
    it("falls back to a full load on a non-2xx response", async () => {
      const result = await runFailingNavigate(() =>
        Promise.resolve(new Response("error", { status: 500 })),
      );
      assert.deepEqual(
        result.assigned,
        ["https://example.test/b"],
        "a non-2xx response triggers a full load to the destination",
      );
      assert.equal(
        result.navigations,
        0,
        "no onNavigate fires on the aborted same-document path",
      );
    });

    it("falls back to a full load on a network error (fetch rejects)", async () => {
      const result = await runFailingNavigate(() =>
        Promise.reject(new Error("network down")),
      );
      assert.deepEqual(
        result.assigned,
        ["https://example.test/b"],
        "a network error triggers a full load to the destination",
      );
      assert.equal(
        result.navigations,
        0,
        "no onNavigate fires on the aborted same-document path",
      );
    });
  });
});
