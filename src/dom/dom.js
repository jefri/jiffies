/**
 * @typedef {Node|string} DenormChildren
 * @typedef {Record<string, string>|DenormChildren} DenormAttrs
 */

function normalizeArguments(
  /** @type DenormAttrs= */ attrs,
  /** @type DenormChildren[]= */ children = []
) {
  if (typeof attrs === 'string' || (attrs && attrs.nodeType)) {
    children.unshift(/** @type string|Node */ (attrs));
    attrs = undefined;
  }
  return /** @type [Record<string, string>, Array<Node | string>] */ ([
    attrs ?? {},
    children,
  ]);
}

/**
 * @template {Element} E
 * @typedef {{update: (attrs: Record<string, string>, ...children: (Node|string)[]) => E}} Updater
 */

/**
 * @template {Element} E
 * @returns {E&Updater<E>}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function up(
  /** @type E|Updater<E> */ element,
  /** @type DenormAttrs= */ attrs,
  /** @type DenormChildren[] */ ...children
) {
  return update(element, ...normalizeArguments(attrs, children));
}

/**
 * @template {Element} E
 * @returns {E&Updater<E>}
 */
function update(
  /** @type E */ element,
  /** @type Record<string, string> */ attrs,
  /** @type Array<Node | string> */ children
) {
  Object.entries(attrs).forEach(([k, v]) =>
    element.setAttributeNS(element.namespaceURI, k, v)
  );
  element.replaceChildren(...children);
  /** @type unknown */ element.update =
    element.update ??
    function (
      /** @type DenormAttrs= */ attrs,
      /** @type DenormChildren[] */ ...children
    ) {
      return update(element, ...normalizeArguments(attrs, children));
    };

  return /** @type E&Updater<E> */ element;
}
