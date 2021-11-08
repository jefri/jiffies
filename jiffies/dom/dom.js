/**
 * @typedef {EventListenerOrEventListenerObject|null} EventHandler
 */

/**
 * @template {Element} N 
 * @typedef {
      N &
      Partial<{
        [Events]: Map<string, EventHandler>,
        update: (attrs?: DenormAttrs<N>, ...children: DenormChildren[]) => Node
      }>
    } Updater
 */

/**
 * @template {Element} N 
 * @typedef {
      N &
      {
        [Events]: Map<string, EventHandler>,
        update: (attrs?: DenormAttrs<N>, ...children: DenormChildrenList) => Node
      }
    } Updatable
 */

/**
 * @template {Element} E
 * @typedef {
    Partial<{style: string | Partial<{[K in keyof CSSStyleDeclaration]: string}>}> |
    {events?:
      Partial<{
        [K in keyof HTMLElementEventMap]: EventHandler
      }> 
    } |
    Partial<{[k in keyof E]: E[k]}> |
    {class?: string}
  } Attrs
 */
/**
 * @typedef {Node|string} DenormChildren
 */
/**
 * @typedef {DenormChildren[]|[CLEAR]} DenormChildrenList
 */
/**
 * @template {Element} E
 * @typedef {Attrs<E>|DenormChildren} DenormAttrs
 */

/**
 * @template {Element} E
 * @param {DenormAttrs<E>|undefined} attrs
 * @return {attrs is Attrs<E>}
 */
function isAttrs(attrs) {
  return !(
    typeof attrs === "string" ||
    (attrs && /** @type Node */ (attrs).nodeType)
  );
}

/**
 * @template {Element} E
 * @template {DenormAttrs<E>} TDenormAttrs
 * @param {TDenormAttrs=} attrs
 * @param {DenormChildrenList=} children
 * @param {Attrs<E>} defaultAttrs
 * @returns {[Attrs<E>, DenormChildrenList]}
 */
export function normalizeArguments(attrs, children = [], defaultAttrs = {}) {
  /** @type {Attrs<E>} */
  let attributes;
  if (isAttrs(attrs)) {
    attributes = /** @type {Attrs<E>} */ (attrs) ?? defaultAttrs;
  } else {
    children.unshift(/** @type string|Node */ (attrs));
    attributes = defaultAttrs;
  }
  return [attributes, children.flat()];
}

/**
 * @template {Element} E
 * @returns {Updatable<E>}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function up(
  /** @type E */ element,
  /** @type DenormAttrs<E>= */ attrs,
  /** @type DenormChildrenList */ ...children
) {
  return update(element, ...normalizeArguments(attrs, children));
}

const Events = Symbol("events");
export const CLEAR = Symbol("Clear children");

/**
 * @template {Element} E
 * @returns {Updatable<E>}
 */
export function update(
  /** @type Updater<E> */ element,
  /** @type Attrs<E> */ attrs,
  /** @type DenormChildrenList */ children
) {
  // Track events, to remove later
  const $events = (element[Events] ??= new Map());
  const { style = {}, events = {}, ...rest } = attrs;

  Object.entries(events).forEach(([k, v]) => {
    if (v === null && $events.has(k)) {
      const listener = /** @type {EventListenerOrEventListenerObject} */ (
        $events.get(k)
      );
      element.removeEventListener(k, listener);
    } else if (!$events.has(k)) {
      element.addEventListener(k, v);
      $events.set(k, v);
    }
  });

  const _style = /** @type {CSSStyleDeclaration} */ (element.style);
  if (_style)
    if (typeof style === "string") {
      _style.cssText = style;
    } else {
      Object.entries(style).forEach(([k, v]) => {
        _style[k] = v;
      });
    }

  Object.entries(rest).forEach(([k, v]) => {
    if (k === "class") {
      /** @type string */ (v)
        .split(/\s+/m)
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
      element.replaceChildren(.../** @type DenormChildren[] */ (children));
    }
  }

  element.update ??= (
    /** @type DenormAttrs<E>= */ attrs,
    /** @type DenormChildren[] */ ...children
  ) => update(element, ...normalizeArguments(attrs, children));

  return /** @type Updatable<E> */ (element);
}
