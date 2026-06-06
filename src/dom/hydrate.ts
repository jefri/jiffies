"use client"; // Hydrate runs entirely client side.

import { reconcileChildren } from "./dom.ts";

/**
 * Self-contained IIFE source for the capture stub. Embedded inline by the SSG
 * build pass so events fired before the client bundle loads are queued in
 * window.__hydrateQueue and replayed after hydration. No external references.
 */
export const captureStubSource = `(function(){
  window.__hydrateQueue = window.__hydrateQueue || [];
  var queue = window.__hydrateQueue;
  var handler = function(event) {
    var path = event.composedPath();
    var unitEl = null;
    for (var i = 0; i < path.length; i++) {
      var node = path[i];
      if (node instanceof Element && customElements.get(node.localName)) {
        unitEl = node;
        break;
      }
    }
    if (!unitEl) return;
    var target = event.target;
    var targetPath = [];
    var cur = target;
    while (cur !== unitEl) {
      var parent = cur.parentNode;
      var siblings = Array.from(parent.childNodes);
      targetPath.unshift(siblings.indexOf(cur));
      cur = parent;
    }
    queue.push({ unitEl: unitEl, type: event.type, targetPath: targetPath, init: { bubbles: event.bubbles, cancelable: event.cancelable } });
  };
  var types = ["click","input","change","submit","keydown"];
  for (var t = 0; t < types.length; t++) {
    document.addEventListener(types[t], handler, true);
  }
})()`;

/**
 * Serialize `units` to a JSON string safe for embedding in an HTML script tag
 * (angle brackets and ampersands are Unicode-escaped).
 */
export function buildPayload(units: Record<string, unknown>[]): string {
  return JSON.stringify(units)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}

/**
 * Read the hydration payload from the `#__hydration` script element embedded
 * by the SSG build step. Returns an empty array when the element is absent.
 */
export function readPayload(): Record<string, unknown>[] {
  const el = window.document.getElementById("__hydration");
  if (!el) return [];
  return JSON.parse(el.textContent ?? "[]") as Record<string, unknown>[];
}

/**
 * Walk `root` depth-first, returning every element whose localName is a
 * defined custom element. Does NOT descend into matched elements — each custom
 * element owns its own subtree; inner elements will be reached by their
 * parent's `el.update()` call, not by `start()`.
 */
function scanUnits(root: ParentNode): Element[] {
  const results: Element[] = [];
  const stack: Element[] = [...root.children].reverse();
  while (stack.length > 0) {
    const el = stack.pop() as Element;
    if (customElements.get(el.localName)) {
      results.push(el);
    } else {
      for (let i = el.children.length - 1; i >= 0; i--) {
        stack.push(el.children[i] as Element);
      }
    }
  }
  return results;
}

/**
 * Scan `root` for registered custom elements and schedule each for hydration.
 * `customElements.whenDefined` resolves as a microtask even when the element
 * is already defined. The callback clears server-rendered children then runs
 * `el.update()`, which re-executes the element's render function and rebuilds
 * its subtree. `root` defaults to `window.document.body`.
 */
export function start(root?: ParentNode): void {
  const r = root ?? window.document.body;
  const units = scanUnits(r);
  const payload = readPayload();
  units.forEach((el, index) => {
    customElements.whenDefined(el.localName).then(() => {
      el.replaceChildren();
      el.update(payload[index]);
      drainQueue(el);
    });
  });
}

// Hydrate custom elements inside `root` without clearing their server-rendered
// children first. `el.update()` reconciles onto the existing DOM so attributes
// and listeners are grafted in place. Recurses after each element hydrates so
// parents are always processed before their nested custom elements.
function startHydrate(root: ParentNode): void {
  for (const el of scanUnits(root)) {
    customElements.whenDefined(el.localName).then(() => {
      el.update();
      startHydrate(el);
    });
  }
}

interface HydrateQueueEntry {
  unitEl: Element;
  type: string;
  targetPath: number[];
  init: { bubbles: boolean; cancelable: boolean };
}

function getHydrateQueue(): HydrateQueueEntry[] {
  const w = window as unknown as Record<string, unknown>;
  w.__hydrateQueue ??= [];
  return w.__hydrateQueue as HydrateQueueEntry[];
}

/**
 * Install capture-phase listeners on `document` that intercept events
 * targeting nodes inside un-hydrated custom elements and push descriptors into
 * `window.__hydrateQueue`. `start()` drains the queue for each element after
 * `el.update()` runs by calling `drainQueue`.
 */
export function installCaptureStub(): void {
  const queue = getHydrateQueue();
  const handler = (event: Event) => {
    const path = event.composedPath() as Node[];
    let unitEl: Element | null = null;
    for (const node of path) {
      if (node instanceof Element && customElements.get(node.localName)) {
        unitEl = node;
        break;
      }
    }
    if (!unitEl) return;
    const target = event.target as Node;
    const targetPath: number[] = [];
    let cur: Node = target;
    while (cur !== unitEl) {
      const parent = cur.parentNode as Node;
      targetPath.unshift(
        Array.from(parent.childNodes).indexOf(cur as ChildNode),
      );
      cur = parent;
    }
    queue.push({
      unitEl,
      type: event.type,
      targetPath,
      init: { bubbles: event.bubbles, cancelable: event.cancelable },
    });
  };
  for (const type of ["click", "input", "change", "submit", "keydown"]) {
    window.document.addEventListener(type, handler, true);
  }
}

function drainQueue(el: Element): void {
  const w = window as unknown as Record<string, unknown>;
  const allEntries = (w.__hydrateQueue ?? []) as HydrateQueueEntry[];
  const mine = allEntries.filter((e) => e.unitEl === el);
  w.__hydrateQueue = allEntries.filter((e) => e.unitEl !== el);
  for (const entry of mine) {
    let node: Node = el;
    let resolved = true;
    for (const idx of entry.targetPath) {
      const child = node.childNodes[idx];
      if (!child) {
        console.warn(
          `hydrateQueue: path index ${idx} out of range, dropping queued ${entry.type}`,
        );
        resolved = false;
        break;
      }
      node = child;
    }
    if (resolved) {
      node.dispatchEvent(new Event(entry.type, entry.init));
    }
  }
}

/**
 * Hydrate a server-rendered page: call `render` once, reconcile the result
 * into `mount` without replacing existing DOM nodes, and graft event handlers
 * onto kept server nodes. Custom-element boundaries are left for each element
 * to hydrate itself. Use this instead of `start` when the full page tree is
 * produced by a single render function rather than independent custom elements.
 */
export function hydrateRoot(mount: Element, render: () => Node | Node[]): void {
  const fresh = [render()].flat() as Node[];
  reconcileChildren(mount, fresh);
  startHydrate(mount);
}
