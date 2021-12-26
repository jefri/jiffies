const Events = Symbol("events");
export const CLEAR = Symbol("Clear children");

export type EventHandler = EventListenerOrEventListenerObject;
export type DenormChildren = Node | string | typeof CLEAR;

export type Updater<E extends Element> = E & {
  [Events]?: Map<string, EventHandler>;
  update?: (attrs?: DenormAttrs<E>, ...children: DenormChildren[]) => Node;
};

export type Updatable<E extends Element> = E & {
  [Events]: Map<string, EventHandler>;
  update: (attrs?: DenormAttrs<E>, ...children: DenormChildren[]) => Node;
};

export type Attrs<E extends Element> = Partial<E> &
  Partial<{
    class: string;
    style: string | Partial<{ [K in keyof CSSStyleDeclaration]: string }>;
    events: Partial<{ [K in keyof HTMLElementEventMap]: EventHandler }>;
  }>;

export type DenormAttrs<E extends Element> = Attrs<E> | DenormChildren;

function isAttrs<E extends Element>(
  attrs: DenormAttrs<E> | undefined
): attrs is Attrs<E> {
  if (!attrs) return false;
  if (typeof attrs === "string") return false;
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

export function up<E extends Element>(
  element: E,
  attrs?: DenormAttrs<E>,
  ...children: DenormChildren[]
): Updatable<E> {
  return update(element, ...normalizeArguments(attrs, children));
}

export function update<E extends Element>(
  element: Updater<E>,
  attrs: Attrs<E>,
  children: DenormChildren[]
): Updatable<E> {
  // Track events, to remove later
  const $events = (element[Events] ??= new Map<string, EventHandler>());
  const { style = {}, events = {}, ...rest } = attrs;

  Object.entries(events).forEach(([k, v]) => {
    if (v === null && $events.has(k)) {
      const listener = $events.get(k)!;
      element.removeEventListener(k, listener);
    } else if (!$events.has(k)) {
      element.addEventListener(k, v);
      $events.set(k, v);
    }
  });

  const _style = (element as { style?: Partial<CSSStyleDeclaration> }).style;
  if (_style) {
    if (typeof style === "string") {
      _style.cssText = style;
    } else {
      Object.entries(style).forEach(([k, v]) => {
        _style[k] = v;
      });
    }
  }

  Object.entries(rest).forEach(([k, v]) => {
    if (k === "class" && typeof v === "string") {
      v.split(/\s+/m)
        .filter((s) => s !== "")
        .forEach((c) => element.classList.add(c));
    } else if (k.startsWith("aria-")) {
      switch (v) {
        case false:
          element.removeAttributeNS(element.namespaceURI, k);
          break;
        case true:
          element.setAttributeNS(element.namespaceURI, k, k);
          break;
        default:
          if (typeof v === "string") {
            element.setAttributeNS(element.namespaceURI, k, v);
          }
      }
    } else {
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
