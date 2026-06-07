"use client"; // The navigation runtime drives same-document transitions client side.

/**
 * Context describing a completed navigation, handed to every `onNavigate` hook
 * (e.g. an analytics pageview). Built by `navigate()` after the head reconcile,
 * so `title` reflects the destination and `url` is absolute.
 */
export interface NavigationContext {
  /** Absolute destination URL of the navigation. */
  url: URL;
  /** document.title after the head reconcile for this navigation. */
  title: string;
  /**
   * "first" on initial load; "push" | "traverse" | "replace" thereafter.
   * Present for shell hooks that distinguish entry kinds; the M1 core always
   * reports "push" for a programmatic `navigate()`.
   */
  type: "first" | "push" | "traverse" | "replace";
}

/** A hook registered through `onNavigate`, run once per completed navigation. */
type NavigateCallback = (ctx: NavigationContext) => void;

/**
 * Registered `onNavigate` hooks, fired in registration order after every
 * completed navigation. Module-level state only: declaring this module installs
 * no listeners and touches no DOM, so importing `./index.ts` is side-effect-free
 * (M1 plan Step 1 invariant).
 */
const navigateCallbacks: NavigateCallback[] = [];

/**
 * Register `cb` to run after every in-app navigation completes (body swapped and
 * hydration scheduled). Invariant: callbacks fire exactly once per navigation,
 * in registration order, with the navigation's `NavigationContext`. Used by
 * shell code such as a GA `page_view`.
 */
export function onNavigate(cb: NavigateCallback): void {
  navigateCallbacks.push(cb);
}

/**
 * Fetch `url` and parse its body text into a detached Document via the global
 * DOMParser. Returns the parsed document; the caller reconciles head and body
 * out of it. Invariant: the returned document is detached — its nodes must be
 * adopted with `document.importNode` before insertion into the live document.
 */
async function fetchDocument(url: URL): Promise<Document> {
  const response = await fetch(url);
  const html = await response.text();
  // TODO(interceptor wiring): a non-2xx / network-error response should fall
  // back to a full document load. The M1 feature test never exercises that path,
  // so it is deferred to the interceptor + click/popstate fallback step.
  return new DOMParser().parseFromString(html, "text/html");
}

/**
 * The shared same-document core that both the Navigation API interceptor and the
 * click/`popstate` fallback funnel into (design §8). Fetches the destination's
 * built HTML, reconciles `<head>`, swaps `<body>`, imports the destination's page
 * modules, hydrates, then fires `onNavigate`. Resolves when hydration has been
 * scheduled and hooks have fired. Implemented incrementally across steps 2–5.
 */
export async function navigate(url: string | URL): Promise<void> {
  const target = new URL(url, window.location.href);
  const destination = await fetchDocument(target);
  // Steps 3–5 consume `destination`: reconcile <head>, swap <body>, import the
  // destination's page modules, hydrate, then fire onNavigate.
  void destination;
}
