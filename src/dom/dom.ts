import * as CSS from "./types/css";

const Events = Symbol("events");
export const CLEAR = Symbol("Clear children");

export type EventHandler = EventListenerOrEventListenerObject;
export type DenormChildren = Node | string | typeof CLEAR;

export type DOMElement = Element &
  DocumentAndElementEventHandlers &
  ElementCSSInlineStyle;

export type Updater<E extends DOMElement> = Omit<E, "style"> & {
  [Events]?: Map<string, EventHandler>;
  update?: (attrs?: DenormAttrs<E>, ...children: DenormChildren[]) => Node;
};

export type Updatable<E extends Element> = Omit<E, "style"> & {
  [Events]: Map<string, EventHandler>;
  update: (attrs?: DenormAttrs<E>, ...children: DenormChildren[]) => Node;
};

export type DomAttrs = {
  class: string;
  style: Partial<CSS.Properties>;
  events: Partial<{
    [K in keyof HTMLElementEventMap]: EventHandler;
  }>;
};

export type Attrs<E extends Element, S = {}> = Partial<E & S & DomAttrs>;

export type DenormAttrs<E extends Element, S = {}> =
  | Attrs<E, S>
  | DenormChildren;

function isAttrs<E extends Element>(
  attrs: DenormAttrs<E> | undefined
): attrs is Attrs<E> {
  if (!attrs) {
    return false;
  }
  if (typeof attrs === "string") {
    return false;
  }
  return !(attrs as Node).nodeType;
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

export function up<E extends DOMElement>(
  element: E,
  attrs?: DenormAttrs<E>,
  ...children: DenormChildren[]
): Updatable<E> {
  return update(element, ...normalizeArguments(attrs, children));
}

export function update<E extends DOMElement>(
  element: Updater<E>,
  attrs: Attrs<E>,
  children: DenormChildren[]
): Updatable<E> {
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
        .forEach((c) => element.classList.add(c));
    }

    let useAttributes =
      k.startsWith("aria-") ||
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

  element.update ??= (attrs, ...children) =>
    update(element, ...normalizeArguments(attrs, children));

  return element as Updatable<E>;
}
