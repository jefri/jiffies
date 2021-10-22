/**
 * @typedef {EventListenerOrEventListenerObject|null} EventHandler
 */

/**
 * @template {Node} N 
 * @typedef {
      N &
      Partial<{
        [Events]: Map<string, EventHandler>,
        update: (attrs?: DenormAttrs, ...children: DenormChildren[]) => Node
      }>
    } Updater
 */

/**
 * @template {Node} N 
 * @typedef {
      N &
      {
        [Events]: Map<string, EventHandler>,
        update: (attrs?: DenormAttrs, ...children: DenormChildren[]) => Node
      }
    } Updatable
 */

/**
 * @typedef {
    Partial<{style: string | Partial<{[K in keyof CSSStyleDeclaration]: string}>}> |
    {events?:
      Partial<{
        [K in keyof HTMLElementEventMap]: EventHandler
      }> 
    } |
    Record<string, string|number|boolean|null>
  } Attrs
 * @typedef {Node|string} DenormChildren
 * @typedef {Attrs|DenormChildren} DenormAttrs
 */

/**
 * @param {DenormAttrs|undefined} attrs
 * @return {attrs is Attrs}
 */
function isAttrs(attrs) {
  return !(
    typeof attrs === "string" ||
    (attrs && /** @type Node */ (attrs).nodeType)
  );
}

/**
 * @template {DenormAttrs} TDenormAttrs
 * @param {TDenormAttrs=} attrs
 * @param {DenormChildren[]=} children
 * @param {Attrs} defaultAttrs
 * @returns {[Attrs, (DenormChildren)[]]}
 */
export function normalizeArguments(attrs, children = [], defaultAttrs = {}) {
  if (isAttrs(attrs)) {
    attrs ??= defaultAttrs;
  } else {
    children.unshift(/** @type string|Node */ (attrs));
    attrs = defaultAttrs;
  }
  return [attrs, children.flat()];
}

/**
 * @template {Element} E
 * @returns {Updatable<E>}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function up(
  /** @type E */ element,
  /** @type DenormAttrs= */ attrs,
  /** @type DenormChildren[] */ ...children
) {
  return update(element, ...normalizeArguments(attrs, children));
}

const Events = Symbol("events");

/**
 * @template {Element} E
 * @returns {Updatable<E>}
 */
function update(
  /** @type Updater<E> */ element,
  /** @type Attrs */ attrs,
  /** @type DenormChildren[] */ children
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

  const _style = /** @type {CSSStyleDeclaration} */ (element).style;
  if (_style)
    if (typeof style === "string") {
      _style.cssText = style;
    } else {
      Object.entries(style).forEach(([k, v]) => {
        _style[k] = v;
      });
    }

  Object.entries(rest).forEach(([k, v]) => {
    switch (k) {
      case "class":
        /** @type string */ (v)
          .split(/\s+/m)
          .filter((s) => s !== "")
          .forEach((c) => element.classList.add(c));
        break;
      // Some IDL properties require setting them directly
      case "disabled":
      case "href":
      case "name":
      case "readonly":
      case "required":
        element[k] = v;
        break;
      default:
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
    }
  });
  element.replaceChildren(...children);
  element.update ??= (
    /** @type DenormAttrs= */ attrs,
    /** @type DenormChildren[] */ ...children
  ) => update(element, ...normalizeArguments(attrs, children));

  return /** @type Updatable<E> */ (element);
}
