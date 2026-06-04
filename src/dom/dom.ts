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
      if ($events.has(k)) {
        element.removeEventListener(k, assertExists($events.get(k)));
        $events.delete(k);
      }
    } else if (v !== undefined) {
      if ($events.has(k)) {
        element.removeEventListener(k, assertExists($events.get(k)));
      }
      element.addEventListener(k as keyof ElementEventMap, v);
      $events.set(k, v);
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
 *    and never detached.
 *  - A mounted child absent from `children` is removed.
 *  - Final child order equals `children`; genuinely new nodes — and existing
 *    nodes that changed position — are placed with `insertBefore`.
 *  - Each node reference appears at most once in `children`: a DOM node can
 *    occupy only one position, so a repeated reference collapses to a single
 *    (last) placement.
 *
 * Invariants:
 *  - O(n) in the number of children. No quadratic scan. (design.md Metrics:
 *    "Linear cost".)
 *  - Removal iterates a SNAPSHOT of the mounted children, NOT the live
 *    `childNodes`, because `removeChild` mutates that collection mid-iteration.
 *  - Namespace-neutral: matching is pure `===`, and `insertBefore`/`removeChild`
 *    are namespace-agnostic, so SVG and custom elements reconcile unchanged.
 *  - Each reused node keeps its own `Symbol(events)` map for free — the node
 *    object is reused, never content-copied, so no event reconciliation.
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
  const keep = new Set(desired);

  // Remove mounted children absent from the desired list. Iterate a SNAPSHOT —
  // removeChild mutates the live childNodes collection mid-loop.
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
