import { Properties } from "./types/css.js";

const Events = Symbol("events");
export const CLEAR = Symbol("Clear children");

export type EventHandler = EventListenerOrEventListenerObject;
export type DenormChildren = Node | string | typeof CLEAR;

export type DOMElement = Element &
  DocumentAndElementEventHandlers &
  ElementCSSInlineStyle;

export type DomAttrs = {
  class: string | string[];
  style: Partial<Properties> | string;
  role: "button" | "list" | "listbox";
  events: Partial<{
    [K in keyof HTMLElementEventMap]: EventHandler | null;
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

export type DOMUpdates<E extends Element = Element> =
  | [DenormAttrs<E>, ...DenormChildren[]]
  | DenormChildren[];

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
      if (v === null) {
        if ($events.has(k)) {
          const listener = $events.get(k)!;
          element.removeEventListener(k, listener);
        }
      } else if (v !== undefined) {
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
    if (k === "class") {
      v = Array.isArray(v)
        ? v
        : (typeof v === "string" ? v : `${v}`).split(/\s+/m);
      (v as string[])
        .filter((s) => s !== "")
        .forEach((c) => {
          if (c.startsWith("!")) {
            element.classList.remove(c.substring(1));
          } else {
            element.classList.add(c);
          }
        });
      return;
    }

    const useNamespace =
      element.namespaceURI &&
      element.namespaceURI != "http://www.w3.org/1999/xhtml";
    const remove = !v;

    if (useNamespace) {
      if (remove) {
        element.removeAttributeNS(element.namespaceURI, k);
      } else if (v === true) {
        element.setAttributeNS(element.namespaceURI, k, k);
      } else {
        element.setAttributeNS(element.namespaceURI, k, v);
      }
    } else {
      if (remove) {
        element.removeAttribute(k);
      } else if (v === true) {
        element.setAttribute(k, k);
      } else {
        element.setAttribute(k, v);
      }
    }
  });

  if (children?.length > 0) {
    element.replaceChildren(
      ...(children[0] === CLEAR ? [] : (children as (string | Node)[]))
    );
  }

  (element as Element).update ??= (attrs, ...children) =>
    update(element, ...normalizeArguments(attrs, children));

  return element as Element;
}
