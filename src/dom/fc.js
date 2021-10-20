/**
 * @template S
 * @typedef {S & import ("./dom").Attrs} Scope
 */

import { normalizeArguments } from "./dom.js";

/**
 * @typedef {import("./dom").DenormAttrs} DenormAttrs
 * @typedef {import("./dom").DenormChildren} DenormChildren
 * @typedef {import("./dom").Updatable<string|Node>} Updateable
 */

/**
 * @template S
 * @param {string} name
 * @param {(attrs: Scope<S>, children: DenormChildren[]) => Updateable|Updateable[]} component
 */
export function FC(name, component) {
  customElements.define(
    name,
    class FCImpl extends HTMLElement {
      constructor() {
        super();
      }

      update(
        /** @type {DenormAttrs=} */ attrs,
        /** @type {DenormChildren[]} */ ...children
      ) {
        [attrs, children] = normalizeArguments(attrs, children);
        this.replaceChildren(...[component(attrs, children)].flat());
      }
    }
  );

  return (
    /** @type {DenormAttrs=} */ attrs,
    /** @type {DenormChildren[]} */ ...children
  ) => {
    const element = document.createElement(name);
    element.update(attrs, ...children);
    return element;
  };
}
