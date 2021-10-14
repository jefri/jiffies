/**
 * @typedef {
    Record<string, string|number|boolean|null> |
    Partial<{style?: string | Partial<{[K in keyof CSSStyleDeclaration]: string}>}> |
    Partial<{
      [K in keyof HTMLElementEventMap]: ((ev?: HTMLElementEventMap[K]) => void)|null
    }>
  } Attrs
 * @typedef {Node|string} DenormChildren
 * @typedef {Attrs|DenormChildren} DenormAttrs
 */

export function normalizeArguments(
  /** @type DenormAttrs= */ attrs,
  /** @type DenormChildren[]= */ children = [],
  defaultAttrs = {}
) {
  if (
    typeof attrs === "string" ||
    (attrs && /** @type Node */ (attrs).nodeType)
  ) {
    children.unshift(/** @type string|Node */ (attrs));
    attrs = undefined;
  }
  return /** @type [Record<string, string>, Array<Node | string>] */ ([
    attrs ?? defaultAttrs,
    children,
  ]);
}

/**
 * @template {Element} E
 * @typedef {E & {update: (attrs: Record<string, string>, ...children: (Node|string)[]) => E}} Updater
 */

/**
 * @template {Element} E
 * @returns {Updater<E>}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function up(
  /** @type Updater<E> */ element,
  /** @type DenormAttrs= */ attrs,
  /** @type DenormChildren[] */ ...children
) {
  return update(element, ...normalizeArguments(attrs, children));
}

const events = Symbol("events");

/**
 * @template {Element} E
 * @returns {E&Updater<E>}
 */
function update(
  /** @type E&{[events]: Map<string, Function>} */ element,
  /** @type Attrs */ attrs,
  /** @type Array<Element | string> */ children
) {
  // Track events, to remove later
  element[events] ??= new Map();
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === null && (v = element[events].get(k)) !== undefined) {
      element.removeEventListener(k, v);
    } else if (v instanceof Function) {
      if (!element[events].has(k)) {
        element.addEventListener(k, v);
        element[events].set(k, v);
      }
    } else {
      switch (k) {
        case "class":
          /** @type string */ (v)
            .split(/\s+/)
            .forEach((c) => element.classList.add(c));
          break;
        case "style":
          if (!element.style) return;
          if (typeof v === "string") {
            element.style.cssText = v;
          } else {
            Object.entries(v).forEach(([k, v]) => {
              element.style[k] = v;
            });
          }
          break;
        // Some IDL properties require setting them directly
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

  return /** @type Updater<E> */ (element);
}
