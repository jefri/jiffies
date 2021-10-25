/**
 * @template {object} S
 * @typedef {Partial<S} Scope
 */

import { CLEAR, normalizeArguments, update } from "./dom.js";
import { object } from "./html.js";

/**
 * @template {Element} E
 * @typedef {import("./dom").DenormAttrs<E>} DenormAttrs
 */
/**
 * @typedef {import("./dom").DenormChildrenList} DenormChildrenList
 * @typedef {import("./dom").Updatable<string|Node>} Updateable
 */

/**
 * @typedef {object} AttrSet
 */

/**
 * @template {object} S
 * @template {Element} E
 * @template {Updateable} E
 * @typedef {(
    el: E,
    attrs: Scope<S>,
    children: DenormChildrenList
  ) => Updateable|Updateable[]} RenderFn
 */

/**
 * @template {object} S
 * @template {Element} E
 * @param {string} name
 * @param {AttrSet|RenderFn<S, E>} attrSet
 * @param {RenderFn<S, E>=} component
 */
export function FC(name, attrSet, component) {
  /** @type {RenderFn<S, E>} */
  let render = component ?? (() => []);
  if (component === undefined && typeof attrSet === "function") {
    render = /** @type RenderFn<S, E> */ (attrSet);
    attrSet = {};
  }

  class FCImpl extends HTMLElement {
    constructor() {
      super();
    }

    /** @type Scope<S> */
    #lastAttrs = {};
    /** @type DenormChildrenList */
    #lastChildren = [];

    update(
      /** @type {Scope<S>|import("./dom.js").DenormChildren=} */ attrs,
      /** @type {DenormChildrenList} */ ...children
    ) {
      [attrs, children] = /** @type {[Partial<S>, DenormChildrenList]} */ (
        normalizeArguments(attrs, children)
      );
      if (children[0] === CLEAR) {
        this.#lastChildren = [];
      } else if (children.length > 0) {
        this.#lastChildren = children;
      }
      this.#lastAttrs = { ...this.#lastAttrs, ...attrs };
      const replace = [render(this, this.#lastAttrs, this.#lastChildren)];
      this.replaceChildren(...replace.flat());
    }
  }

  customElements.define(name, FCImpl);

  return (
    /** @type {Scope<S>=} */ attrs,
    /** @type {DenormChildrenList} */ ...children
  ) => {
    const element = /** @type {FCImpl} */ (document.createElement(name));
    element.update(attrs, ...children);
    return element;
  };
}

/**
 * @template {object} S
 * @template {HTMLElement} E
 * @typedef {Scope<S> & import("./dom.js").Updatable<E>} Component
 */
/**
 * @template {object} S
 * @template {HTMLElement} E
 * @typedef {{new (): Component<S, E>}} ComponentClass
 * @property {string} name
 */
/**
 * @template {object} S
 * @template {HTMLElement} E
 * @param {ComponentClass<S, E>} clazz
 */
export function C(clazz) {
  customElements.define(clazz.name, clazz);

  return (
    /** @type {Scope<S>=} */ attrs,
    /** @type {DenormChildrenList} */ ...children
  ) => {
    const element = /** @type {Component<E, S>} */ (
      document.createElement(clazz.name)
    );
    element.update(attrs, ...children);
    return element;
  };
}
