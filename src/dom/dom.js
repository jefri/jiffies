/**
 * @typedef {(event: Event) => void} EventHandler
 */

/**
 * @typedef {{update: (attrs?: DenormAttrs, ...children: DenormChildren[]) => Node}} Updater
 */
/**
 * @template {Element} N 
 * @typedef {
      N &
      Partial<{[$events]: Map<string, EventListenerOrEventListenerObject>} &
      Partial<Updater>>
    } Updatable
 */
/**
 * @typedef {
    Partial<{style: string | Partial<{[K in keyof CSSStyleDeclaration]: string}>}> |
    {events?:
      Partial<{
        [K in keyof HTMLElementEventMap]: EventListenerOrEventListenerObject 
      }> 
    }|
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
 * @param {DenormAttrs=} attrs
 * @param {DenormChildren[]=} children
 * @param {Attrs} defaultAttrs
 * @returns {[Attrs, (DenormChildren)[]]}
 */
export function normalizeArguments(
  /** @type DenormAttrs= */ attrs,
  /** @type DenormChildren[]= */ children = [],
  defaultAttrs = {}
) {
  if (isAttrs(attrs)) {
    return [attrs ?? defaultAttrs, children];
  } else {
    children.unshift(/** @type string|Node */ (attrs));
    return [defaultAttrs, children];
  }
}

/**
 * @template {Element} E
 * @returns {E&Updater}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function up(
  /** @type E */ element,
  /** @type DenormAttrs= */ attrs,
  /** @type DenormChildren[] */ ...children
) {
  return update(element, ...normalizeArguments(attrs, children));
}

const $events = Symbol("events");

/**
 * @template {Element} E
 * @returns {E&Updater}
 */
function update(
  /** @type Updatable<E> */ element,
  /** @type Attrs */ attrs,
  /** @type DenormChildren[] */ children
) {
  // Track events, to remove later
  element[$events] ??= new Map();
  const { style = {}, events = {}, ...rest } = attrs;

  Object.entries(events).forEach(([k, v]) => {
    if (v === null && element[$events].has(k)) {
      const listener = /** @type {EventListenerOrEventListenerObject} */ (
        element[$events].get(k)
      );
      element.removeEventListener(k, listener);
    } else if (!element[$events].has(k)) {
      element.addEventListener(k, v);
      element[$events].set(k, v);
    }
  });

  if (typeof style === "string") {
    element.style.cssText = style;
  } else {
    Object.entries(style).forEach(([k, v]) => {
      element.style[k] = v;
    });
  }

  Object.entries(attrs).forEach(([k, v]) => {
    switch (k) {
      case "class":
        /** @type string */ (v)
          .split(/\s+/)
          .forEach((c) => element.classList.add(c));
        break;
      // Some IDL properties require setting them directly
      case "disabled":
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

  return /** @type E&Updater */ (element);
}
