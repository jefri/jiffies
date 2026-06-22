import { assert, assertExists } from "../assert.ts";
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
  global.MouseEvent ??= window.MouseEvent as unknown as typeof MouseEvent;
  global.Element ??= window.Element as unknown as typeof Element;
}

export const XHTML_NAMESPACE_URI = "http://www.w3.org/1999/xhtml";
export const SVG_NAMESPACE_URI = "http://www.w3.org/2000/svg";

const Events = Symbol("events");
export const CLEAR = Symbol("Clear children");

// Node.ELEMENT_NODE; the Node global is not installed in the jsdom bootstrap
// above, so the numeric constant is used directly (cf. nodeType 3 for text).
const ELEMENT_NODE = 1;

export type EventHandler = EventListenerOrEventListenerObject;
export type DenormChildren =
  | Node
  | string
  | typeof CLEAR
  | null
  | undefined
  | false;

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
  // Drop conditional/absent children (React's `{cond && <X/>}` idiom): null,
  // undefined, and false. `0` and `""` are kept — they are legitimate text
  // nodes, and dropping them would reintroduce the React `0`-renders-nothing bug.
  return [attributes, children.flat().filter((c) => c != null && c !== false)];
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
 * stacking, no orphans. `events` is the element's own `[Events]` map; it
 * stays the single source of truth.
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

  for (const [k, v] of Object.entries(attrs.events ?? {})) {
    if (v === null) {
      clearListener(element, $events, k);
    } else if (v !== undefined) {
      setListener(element, $events, k, v);
    }
  }
  element.toggleAttribute("data-hydrate", $events.size > 0);

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

    if (!v) {
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
 * Reconcile `element`'s mounted children against expected `children`, mutating the live DOM in place.
 */
export function reconcileChildren(
  element: Node,
  children: (string | Node)[],
): void {
  const desired = findDesiredNodes(element, children);

  const { mountedSet, unclaimed } = findUnclaimedNodes(desired, element);

  patchUnclaimedNodes(desired, mountedSet, unclaimed);

  clearUnwantedNodes(desired, element);

  insertDesiredNodes(element, desired);
}

function findDesiredNodes(element: Node, children: (string | Node)[]): Node[] {
  const doc = element.ownerDocument ?? window.document;
  const desired: Node[] = children.map((child) =>
    typeof child === "string" ? doc.createTextNode(child) : child,
  );
  return desired;
}

function insertDesiredNodes(element: Node, desired: Node[]) {
  let cursor: ChildNode | null = element.firstChild;
  for (const node of desired) {
    if (node === cursor) {
      cursor = cursor.nextSibling;
    } else {
      element.insertBefore(node, cursor);
    }
  }
}

function clearUnwantedNodes(desired: Node[], element: Node) {
  const keep = new Set(desired);
  for (const mounted of Array.from(element.childNodes)) {
    if (!keep.has(mounted)) {
      element.removeChild(mounted);
    }
  }
}

function patchUnclaimedNodes(
  desired: Node[],
  mountedSet: Set<Node>,
  unclaimed: Node[],
) {
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
}

function findUnclaimedNodes(
  desired: Node[],
  element: Node,
): { mountedSet: Set<Node>; unclaimed: Node[] } {
  const unclaimed: Node[] = [];
  const desiredSet = new Set<Node>(desired);
  const mountedSet = new Set<Node>(element.childNodes);
  for (const mounted of Array.from(element.childNodes)) {
    if (mounted.nodeType === ELEMENT_NODE && !desiredSet.has(mounted)) {
      unclaimed.push(mounted);
    }
  }
  return { mountedSet, unclaimed };
}

/**
 * A unit boundary the reconcile, hydration, and SSG passes treat as opaque: a
 * registered custom element (FC), or any element carrying `data-fc` (FCC). Both
 * own their own subtree, so a parent's reconcile must not descend into them.
 */
export function isUnit(el: Element): boolean {
  return customElements.get(el.localName) != null || el.hasAttribute("data-fc");
}

/**
 * Walk `root` depth-first and return every unit (`isUnit`) in document order,
 * descending INTO units so nested units are included. The server payload build
 * and the client hydration scan must enumerate units in the same order, or a
 * payload index will not line up.
 */
export function scanAllUnits(root: ParentNode): Element[] {
  const results: Element[] = [];
  const stack: Element[] = [...root.children].reverse() as Element[];
  while (stack.length > 0) {
    const el = stack.pop() as Element;
    if (isUnit(el)) {
      results.push(el);
    }
    for (let i = el.children.length - 1; i >= 0; i--) {
      stack.push(el.children[i] as Element);
    }
  }
  return results;
}

/** True if `el` has a unit ancestor (i.e. it is a nested unit). */
export function isNested(el: Element, units: Element[]): boolean {
  let parent = el.parentElement;
  while (parent !== null) {
    if (units.includes(parent)) return true;
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Reconstruct a unit's props from its attributes, skipping the `data-fc` marker.
 */
export function propsFromElement(el: Element): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attr of el.attributes) {
    if (attr.name === "data-fc") continue;
    props[attr.name] = attr.value;
  }
  return props;
}

export function patchNode(kept: Element, fresh: Element): void {
  assert(kept.nodeName === fresh.nodeName, "patching nodes of different types");

  // Remove `kept` attributes that aren't on `fresh`, then add `fresh` attributes not on `kept`.
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

  // Similar to attributes, but operating in a map on the side rather than the node itself.
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

  // Unit boundaries rebuild their own subtrees
  if (isUnit(kept)) return;

  reconcileChildren(kept, Array.from(fresh.childNodes));
}
