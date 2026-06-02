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
  // Track events, to remove later
  element[Events] ??= new Map<string, EventHandler>();
  const $events = element[Events];
  // const { style = {}, events = {}, ...rest } = attrs;

  for (const [k, v] of Object.entries(
    (attrs.events as NonNullable<typeof attrs.events>) ?? {},
  )) {
    if (v === null) {
      if ($events.has(k)) {
        const listener = assertExists($events.get(k));
        element.removeEventListener(k, listener);
      }
    } else if (v !== undefined) {
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

    const useNamespace = false;
    element.namespaceURI &&
      element.namespaceURI !== XHTML_NAMESPACE_URI &&
      element.namespaceURI !== SVG_NAMESPACE_URI;
    const remove = !v;

    if (useNamespace) {
      if (remove) {
        element.removeAttributeNS(element.namespaceURI, k);
      } else if (v === true) {
        element.setAttributeNS(element.namespaceURI, k, k);
      } else {
        element.setAttributeNS(element.namespaceURI, k, String(v));
      }
    } else {
      if (remove) {
        element.removeAttribute(k);
      } else if (v === true) {
        element.setAttribute(k, k);
      } else {
        element.setAttribute(k, String(v));
      }
    }
  }

  if (children?.length > 0) {
    element.replaceChildren(
      ...(children[0] === CLEAR ? [] : (children as (string | Node)[])),
    );
  }

  (element as Element).update ??= (attrs, ...children) =>
    update(element, ...normalizeArguments(attrs, children));

  return element as Element;
}
