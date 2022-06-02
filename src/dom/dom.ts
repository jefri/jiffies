import { Properties } from "./types/css.js";

const Events = Symbol("events");
export const CLEAR = Symbol("Clear children");

export type EventHandler = EventListenerOrEventListenerObject;
export type DenormChildren = Node | string | typeof CLEAR;

export type DOMElement = Element &
  DocumentAndElementEventHandlers &
  ElementCSSInlineStyle;

export type DomAttrs = {
  class: string;
  style: Partial<Properties> | string;
  role: "button" | "list";
  events: Partial<{
    [K in keyof HTMLElementEventMap]: EventHandler;
  }>;
};

export type Attrs<E extends Omit<Element, "update">, S = {}> = Partial<
  Omit<E, "style"> & S & DomAttrs
>;

export type DenormAttrs<E extends Omit<Element, "update">, S = {}> =
  | Attrs<E, S>
  | DenormChildren;

declare global {
  interface Element {
    [Events]: Map<string, EventHandler>;
    update(attrs?: DenormAttrs<Element>, ...children: DenormChildren[]): this;
  }
}

function isAttrs<E extends Element>(
  attrs: DenormAttrs<E> | undefined
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
  defaultAttrs: Attrs<E> = {}
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
  children: DenormChildren[]
): Element {
  // Track events, to remove later
  const $events = (element[Events] ??= new Map<string, EventHandler>());
  const { style = {}, events = {}, ...rest } = attrs;

  Object.entries(events as NonNullable<typeof attrs.events>).forEach(
    ([k, v]) => {
      if (v === null && $events.has(k)) {
        const listener = $events.get(k)!;
        element.removeEventListener(k, listener);
      } else if (!$events.has(k)) {
        element.addEventListener(k as keyof ElementEventMap, v);
        $events.set(k, v);
      }
    }
  );

  const _style = (element as { style?: Partial<CSSStyleDeclaration> }).style;
  if (_style) {
    if (typeof style === "string") {
      _style.cssText = style;
    } else {
      Object.entries(style as Partial<CSSStyleDeclaration>).forEach(
        ([k, v]) => {
          // @ts-ignore Object.entries is unable to statically look into args
          _style[k] = v;
        }
      );
    }
  }

  Object.entries(rest).forEach(([k, v]) => {
    if (k === "class" && typeof v === "string") {
      v.split(/\s+/m)
        .filter((s) => s !== "")
        .forEach((c) => {
          if (c.startsWith("!")) {
            element.classList.remove(c.substring(1));
          } else {
            element.classList.add(c);
          }
        });
    }

    let useAttributes =
      k.startsWith("aria-") ||
      k == "role" ||
      element.namespaceURI != "http://www.w3.org/1999/xhtml";

    if (useAttributes) {
      switch (v) {
        case false:
          element.removeAttributeNS(element.namespaceURI, k);
          break;
        case true:
          element.setAttributeNS(element.namespaceURI, k, k);
          break;
        default:
          if (v === "") {
            element.removeAttributeNS(element.namespaceURI, k);
          } else {
            element.setAttributeNS(element.namespaceURI, k, v);
          }
      }
    } else {
      // @ts-ignore Object.entries is unable to statically look into args
      element[k] = v;
    }
  });

  if (children?.length > 0) {
    if (children[0] === CLEAR) {
      element.replaceChildren();
    } else {
      element.replaceChildren(...(children as (string | Node)[]));
    }
  }

  (element as Element).update ??= (attrs, ...children) =>
    update(element, ...normalizeArguments(attrs, children));

  return element as Element;
}
