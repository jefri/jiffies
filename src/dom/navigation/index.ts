"use client"; // The navigation runtime drives same-document transitions client side.

import { start } from "../hydrate.ts";

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
 * completed navigation. Module-level state only: this module installs no
 * listeners, touches no DOM, and never hydrates or calls `start()` at import
 * time (M1 plan Step 1 invariant). The static `../hydrate.ts` import does pull
 * in `../dom.ts`, whose jsdom bootstrap runs only in windowless Node and is
 * skipped under a browser or jsdom where `window` already exists — so importing
 * `./index.ts` is side-effect-free in those environments.
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
 * Attribute marking a one-time "shell" node in `<head>` (a theme bootstrap, an
 * analytics tag): the build emits it, and the head reconciler preserves any node
 * carrying it by identity across navigations so its inline script never re-runs.
 */
const SHELL_ATTR = "data-shell";

/** True for a head node the reconciler must preserve in place across navigations. */
function isShell(node: ChildNode): boolean {
  return node instanceof Element && node.hasAttribute(SHELL_ATTR);
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
 * Reconcile the live `<head>` against `destHead`. Preserves every existing
 * `[data-shell]` node by identity; replaces all non-shell live nodes with
 * `destHead`'s non-shell nodes (adopted into the live document). Applies the
 * destination `<title>` via `document.title` and mirrors `<html lang>`. Leaves
 * the destination `#__hydration` payload in place for the subsequent `start()`.
 */
function reconcileHead(destHead: HTMLHeadElement): void {
  const liveHead = window.document.head;

  // Drop every live per-page node, leaving the [data-shell] nodes untouched —
  // preserved by identity so their inline scripts (theme, analytics) never re-run.
  for (const node of [...liveHead.childNodes]) {
    if (!isShell(node)) node.remove();
  }

  // Adopt the destination's per-page nodes (title, metadata, the #__hydration
  // payload) and append them. The destination's own shell nodes are dropped —
  // the live ones already cover them.
  for (const node of [...destHead.childNodes]) {
    if (isShell(node)) continue;
    liveHead.appendChild(window.document.importNode(node, true));
  }

  // Apply <title> through document.title so it takes effect immediately, and
  // mirror <html lang> from the destination when it differs.
  const destRoot = destHead.ownerDocument.documentElement;
  window.document.title = destHead.ownerDocument.title;
  if (destRoot.lang && destRoot.lang !== window.document.documentElement.lang) {
    window.document.documentElement.lang = destRoot.lang;
  }
}

/**
 * Replace the live `<body>` children with `destBody`'s children, adopted via
 * `document.importNode`. New element instances replace the old ones — a child
 * replacement, not an in-place patch — so the destination's island is a fresh
 * node. Any `<script type="module">` rides along inert: a script inserted via
 * the DOM never executes on its own, which is why `importPageModules` imports it
 * explicitly. (`destBody` is typed `HTMLElement` because `Document.body` is.)
 */
function swapBody(destBody: HTMLElement): void {
  const adopted = [...destBody.childNodes].map((node) =>
    window.document.importNode(node, true),
  );
  window.document.body.replaceChildren(...adopted);
}

/** Matches each inline `import "<spec>";` statement, capturing the specifier. */
const IMPORT_STATEMENT = /import\s+["']([^"']+)["']\s*;?/g;

/**
 * Extract every `import "<spec>";` specifier from `root`'s
 * `<script type="module">` elements and dynamically import each, awaiting all.
 * The build emits inline `import` statements (not `src` attributes, matching
 * src/ssg/rewrite.ts), and a script node inserted via the DOM never executes on
 * its own, so the runtime imports the specifiers itself. The ES module cache
 * dedupes chunks already loaded this session.
 */
async function importPageModules(root: ParentNode): Promise<void> {
  const specifiers: string[] = [];
  for (const script of root.querySelectorAll('script[type="module"]')) {
    for (const match of (script.textContent ?? "").matchAll(IMPORT_STATEMENT)) {
      specifiers.push(match[1]);
    }
  }
  await Promise.all(specifiers.map((spec) => import(spec)));
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
  reconcileHead(destination.head);
  swapBody(destination.body);
  await importPageModules(window.document.body);

  // Hydrate the swapped-in body: start() reads the destination #__hydration
  // payload (placed by reconcileHead) and schedules each island's update().
  start(window.document.body);

  // Report the completed navigation. title reflects the reconciled <head>; url
  // is the absolute target. Hooks fire once each, in registration order.
  const context: NavigationContext = {
    url: target,
    title: window.document.title,
    type: "push",
  };
  for (const cb of navigateCallbacks) cb(context);
}
