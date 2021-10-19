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
 * @param {(attrs: Scope<S>, children: DenormChildren[]) => Updateable} component
 */
export function FC(component) {
  return (
    /** @type {DenormAttrs=} */ attrs,
    /** @type {DenormChildren[]} */ ...children
  ) => {
    [attrs, children] = normalizeArguments(attrs, children);
    return component(attrs, children);
  };
}
