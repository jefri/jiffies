import { assertExists } from "../assert.ts";
import type { Properties as SVGProperties } from "./types/css.ts";

if (typeof window === "undefined") {
  const { JSDOM } = await import("jsdom");
  // biome-ignore lint/suspicious/noGlobalAssign: Load JSDom globally
  window = global.window = new JSDOM().window as unknown as Window &
    typeof globalThis;
  global.HTMLElement ??= window.HTMLElement;
  global.customElements ??= window.customElements;
  // Unconditional: jsdom's dispatchEvent instanceof-checks its own Event class, so Node's native Event must be replaced.
  global.Event = window.Event as unknown as typeof Event;
}

export const XHTML_NAMESPACE_URI = "http://www.w3.org/1999/xhtml";
export const SVG_NAMESPACE_URI = "http://www.w3.org/2000/svg";

const Events = Symbol("events");
export const CLEAR = Symbol("Clear children");

// Node.ELEMENT_NODE; the Node global is not installed in the jsdom bootstrap
// above, so the numeric constant is used directly (cf. nodeType 3 for text).
const ELEMENT_NODE = 1;

export type EventHandler = EventListenerOrEventListenerObject;
export type DenormChildren = Node | string | typeof CLEAR;

export type DOMElement = Element & ElementCSSInlineStyle;

export type DomAttrs = {
  class: string | string[];
  style: Partial<SVGProperties> | string;
  role: "button" | "list" | "listbox";
  events: Partial<{
    [K in keyof HTMLElementEventMap]: EventHandler | null;
  }>;
};

export type Attrs<E extends Omit<Element, "update">, S = object> = Partial<
  Omit<{ [k in keyof E]: string | number | boolean }, "style" | "toString"> &
    S &
    DomAttrs
>;

export type DenormAttrs<E extends Omit<Element, "update">, S = object> =
  | Attrs<E, S>
  | DenormChildren;

declare global {
  interface Element {
    [Events]: Map<string, EventHandler>;
    update(attrs?: DenormAttrs<Element>, ...children: DenormChildren[]): this;
  }
}

export type DOMUpdates<E extends Element = Element> =
  | [DenormAttrs<E>, ...DenormChildren[]]
  | DenormChildren[];

function isAttrs<E extends Element>(
  attrs: DenormAttrs<E> | undefined,
): attrs is Attrs<E> {
  if (!attrs) {
    return false;
  }
  if (typeof attrs === "object") {
    return !(attrs as Node).nodeType;
  }
  return false;
}

export function normalizeArguments<E extends Element>(
  attrs?: DenormAttrs<E>,
  children: DenormChildren[] = [],
  defaultAttrs: Attrs<E> = {},
): [Attrs<E>, DenormChildren[]] {
  let attributes: Attrs<E>;
  if (isAttrs(attrs)) {
    attributes = attrs;
  } else {
    if (attrs !== undefined) {
      children.unshift(attrs as DenormChildren);
    }
    attributes = defaultAttrs;
  }
  return [attributes, children.flat()];
}

export function up<E extends Element>(
  element: Omit<E, "update">,
  attrs?: DenormAttrs<E>,
  ...children: DenormChildren[]
): E {
  return update(element, ...normalizeArguments(attrs, children)) as E;
}

/**
 * (Re)attach a single listener for `type`, replacing any handler `events`
 * already tracks for it, so each event has exactly one live handler — no
 * stacking, no orphans (the discipline pinned by `c8976b8`). `events` is the
 * element's own `[Events]` map; it stays the single source of truth.
 */
function setListener(
  target: EventTarget,
  events: Map<string, EventHandler>,
  type: string,
  handler: EventHandler,
): void {
  if (events.has(type)) {
    target.removeEventListener(type, assertExists(events.get(type)));
  }
  target.addEventListener(type, handler);
  events.set(type, handler);
}

/** Detach the listener `events` tracks for `type`, if any, and forget it. */
function clearListener(
  target: EventTarget,
  events: Map<string, EventHandler>,
  type: string,
): void {
  if (events.has(type)) {
    target.removeEventListener(type, assertExists(events.get(type)));
    events.delete(type);
  }
}

export function update(
  element: Omit<Element, "update">,
  attrs: Attrs<Element>,
  children: DenormChildren[],
): Element {
  element[Events] ??= new Map<string, EventHandler>();
  const $events = element[Events];

  for (const [k, v] of Object.entries(
    (attrs.events as NonNullable<typeof attrs.events>) ?? {},
  )) {
    if (v === null) {
      clearListener(element, $events, k);
    } else if (v !== undefined) {
      setListener(element, $events, k, v);
    }
  }

  const _style = (element as { style?: Partial<CSSStyleDeclaration> }).style;
  if (_style) {
    if (typeof attrs.style === "string") {
      _style.cssText = attrs.style;
    } else {
      for (const [k, v] of Object.entries(
        (attrs.style as Partial<CSSStyleDeclaration>) ?? {},
      )) {
        // @ts-expect-error Object.entries is unable to statically look into args
        _style[k] = v;
      }
    }
  }

  for (const [k, v] of Object.entries(attrs)) {
    if (k === "style") {
      continue;
    }

    if (k === "events") {
      continue;
    }

    if (k === "class") {
      const cs = Array.isArray(v) ? v : String(v).split(/\s+/m).filter(Boolean);
      for (const c of cs) {
        if (c.startsWith("!")) {
          element.classList.remove(c.substring(1));
        } else {
          element.classList.add(c);
        }
      }
      continue;
    }

    const remove = !v;
    if (remove) {
      element.removeAttribute(k);
    } else if (v === true) {
      element.setAttribute(k, k);
    } else {
      element.setAttribute(k, String(v));
    }
  }

  if (children?.length > 0) {
    reconcileChildren(
      element,
      children[0] === CLEAR ? [] : (children as (string | Node)[]),
    );
  }

  (element as Element).update ??= (attrs, ...children) =>
    update(element, ...normalizeArguments(attrs, children));

  return element as Element;
}

/**
 * Reconcile `element`'s mounted children against `children` by NODE OBJECT
 * IDENTITY, mutating the live DOM in place. Replaces the `replaceChildren`
 * calls in `update()` and FC `update()`.
 *
 * Why: the library's core model is "hold a node reference and reuse it." A
 * child passed back by the same reference must stay attached across an update,
 * so its focus, scroll position, text selection, and connected state survive.
 * `replaceChildren` detaches every child first, which loses all of that.
 *
 * Contract:
 *  - A `string` entry is materialized into a fresh text node every call
 *    (strings carry no identity, so text children rebuild — same as today).
 *  - A `children` entry that `===` a currently-mounted child is left in place
 *    and never detached (identity match — the first, highest-precedence pass).
 *  - A genuinely-fresh element with no identity match reuses, in place, the next
 *    unclaimed mounted element of the same `nodeName` (positional same-tag
 *    reuse — the second pass). The kept node stays attached, so its focus,
 *    selection, scroll, and connected state survive; the fresh element is
 *    discarded. A tag mismatch or an exhausted cursor leaves the fresh element
 *    genuinely new.
 *  - Keyless caveat: positional matching pairs the k-th unclaimed fresh element
 *    with the k-th unclaimed mounted element. When a preceding sibling's tag
 *    changes, the cursor is consumed on that mismatch, so a later same-tag node
 *    can fail to be reused — or a genuinely-new node can reuse, and inherit the
 *    un-overwritten state of, an unrelated same-tag node. This is the standard
 *    keyless tradeoff; explicit keys (the deferred `KEY`/`keyed` work, see
 *    TASKS.md) are the escape hatch for churny reorders.
 *  - A mounted child absent from the reconciled list is removed — including
 *    non-element nodes (comments, or text not passed back by reference), which
 *    never participate in positional reuse and so are rebuilt every pass.
 *  - Final child order equals `children`; genuinely new nodes — and existing
 *    nodes that changed position — are placed with `insertBefore`.
 *  - Each node reference appears at most once in `children`: a DOM node can
 *    occupy only one position, so a repeated reference collapses to a single
 *    (last) placement.
 *
 * Invariants:
 *  - O(n) in the number of children. No quadratic scan. (design.md Metrics:
 *    "Linear cost".) Identity claims via a Set; the positional pass is a single
 *    forward walk of one cursor over the unclaimed mounted elements.
 *  - Removal iterates a SNAPSHOT of the mounted children, NOT the live
 *    `childNodes`, because `removeChild` mutates that collection mid-iteration.
 *  - Namespace-neutral: identity matching is pure `===`, same-tag matching uses
 *    `nodeName`, and `insertBefore`/`removeChild` are namespace-agnostic, so SVG
 *    and custom elements reconcile unchanged.
 *  - A positionally-reused node keeps its own `Symbol(events)` map and children
 *    untouched here — Step 1 reuses in place without mutating; the node-to-node
 *    patch (Steps 2–3) is what reflects the fresh node's surface and children.
 */
export function reconcileChildren(
  element: Node,
  children: (string | Node)[],
): void {
  const doc = element.ownerDocument ?? window.document;
  // Materialize the desired list: strings become fresh text nodes (they carry
  // no identity); nodes are kept by reference for identity matching below.
  const desired: Node[] = children.map((child) =>
    typeof child === "string" ? doc.createTextNode(child) : child,
  );

  // Pass 1 — identity (highest precedence): a desired entry that IS a
  // currently-mounted child claims that node by reference. `desiredSet` lets the
  // collection below test "is this mounted node claimed?"; `mountedSet` lets
  // pass 2 test "is this desired node already in the tree?" — such a node is an
  // identity match (possibly repositioned later by the placement cursor), never
  // a fresh carrier. Collect the mounted elements no desired entry claims; the
  // positional pass draws from these.
  const desiredSet = new Set<Node>(desired);
  const mountedSet = new Set<Node>(element.childNodes);
  const unclaimed: Node[] = [];
  for (const mounted of Array.from(element.childNodes)) {
    if (mounted.nodeType === ELEMENT_NODE && !desiredSet.has(mounted)) {
      unclaimed.push(mounted);
    }
  }

  // Pass 2 — positional same-tag reuse: a single forward cursor over the
  // unclaimed mounted elements. Each genuinely-fresh desired element (an element
  // with no identity match) reuses the next unclaimed mounted element when their
  // nodeName agrees, substituting the kept node into the desired slot so it is
  // never detached below. A tag mismatch consumes that mounted element (it falls
  // out of `keep` and is removed) AND forfeits any later same-tag reuse for this
  // fresh element, which becomes new — the keyless positional tradeoff spelled
  // out in the contract above. An exhausted cursor likewise leaves it new. Text
  // nodes never participate.
  let claim = 0;
  for (let i = 0; i < desired.length; i++) {
    const node = desired[i];
    if (node.nodeType !== ELEMENT_NODE || mountedSet.has(node)) {
      continue;
    }
    if (claim < unclaimed.length) {
      if (unclaimed[claim].nodeName === node.nodeName) {
        patchNode(unclaimed[claim] as Element, node as Element);
        desired[i] = unclaimed[claim];
      }
      claim++;
    }
  }

  // Remove mounted children absent from the reconciled list. Iterate a SNAPSHOT
  // — removeChild mutates the live childNodes collection mid-loop. `keep` is
  // rebuilt after the positional pass so reused nodes survive removal.
  const keep = new Set(desired);
  for (const mounted of Array.from(element.childNodes)) {
    if (!keep.has(mounted)) {
      element.removeChild(mounted);
    }
  }

  // Place each desired node in order against a cursor over the survivors. A node
  // already at the cursor is in position — left untouched, so reused subtrees
  // are never detached. Otherwise insertBefore moves or inserts it.
  let cursor: ChildNode | null = element.firstChild;
  for (const node of desired) {
    if (node === cursor) {
      cursor = cursor.nextSibling;
    } else {
      element.insertBefore(node, cursor);
    }
  }
}

/**
 * Patch a kept live node from a freshly-built spec node of the SAME tag, reusing
 * `kept` in place so its focus, selection, scroll, and connected state survive
 * (the reuse `reconcileChildren`'s positional pass established). This covers the
 * node's own surface; recursion into children lands in Step 3.
 *
 * Behavior:
 *  - Attributes: copy `fresh`'s attributes onto `kept` — add new, change
 *    differing, and REMOVE any attribute `kept` carries that `fresh` lacks.
 *    (Attribute removal is new here: `update()` only removes on a falsy attrs
 *    value; a node-to-node diff must compare both attribute sets.) This diffs the
 *    already-SERIALIZED attributes of two built nodes, not the `DomAttrs` sugar —
 *    `class` and `style` are plain string attributes here (the additive
 *    `classList` / per-property `style` handling lives in `update()`, which has
 *    already run on `fresh`), so a flat get/set/remove diff is correct.
 *  - Listeners: transfer `fresh`'s `[Events]` map onto `kept` with the
 *    replace-not-stack discipline `update()` uses — remove kept listeners
 *    `fresh` no longer declares, (re)attach the rest. No stacking, no orphans.
 *
 * Precondition: `kept.nodeName === fresh.nodeName` (caller matched by tag).
 * Invariant: `fresh` is discarded; only `kept` remains attached.
 */
export function patchNode(kept: Element, fresh: Element): void {
  // Attributes: remove any `kept` carries that `fresh` lacks, then add or update
  // from `fresh`. Snapshot `kept.attributes` — removeAttribute mutates it.
  for (const { name } of Array.from(kept.attributes)) {
    if (!fresh.hasAttribute(name)) {
      kept.removeAttribute(name);
    }
  }
  for (const { name, value } of Array.from(fresh.attributes)) {
    if (kept.getAttribute(name) !== value) {
      kept.setAttribute(name, value);
    }
  }

  // Listeners: replace-not-stack via the shared helpers update() uses. Clear the
  // kept listeners the fresh node no longer declares, then (re)attach the rest
  // so each event keeps exactly one handler — no stacking, no orphans.
  kept[Events] ??= new Map<string, EventHandler>();
  const keptEvents = kept[Events];
  const freshEvents = fresh[Events] ?? new Map<string, EventHandler>();
  for (const [type] of keptEvents) {
    if (!freshEvents.has(type)) {
      clearListener(kept, keptEvents, type);
    }
  }
  for (const [type, handler] of freshEvents) {
    setListener(kept, keptEvents, type, handler);
  }

  // Children: recurse one level down, reusing reconcileChildren so identity-then-
  // positional matching applies at every depth — nested same-tag nodes (e.g. a
  // focused input) are reused in place, not rebuilt. Each node in the patched
  // subtree is visited once, so total work stays O(n). This is the deliberate
  // departure from the one-level-deep reentrancy model: nested identity
  // preservation is impossible without it; the fresh throwaway tree is still
  // allocated each render.
  reconcileChildren(kept, Array.from(fresh.childNodes));
}
