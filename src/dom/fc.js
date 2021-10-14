/**
 * @template S
 * @typedef {S & import ("./dom").Attrs} Scope
 */

import { normalizeArguments } from "./dom.js";

/**
 * @typedef {import("./dom").Updater<Element>} Updater
 */

/**
 * @template S
 * @param {(attrs: Scope<S>, children: Updater[]) => Updater} component
 */
export function FC(component) {
  return (
    /** @type {import ("./dom").DenormAttrs}= */ attrs,
    /** @type Array<Node|string> */ ...children
  ) => {
    [attrs, children] = normalizeArguments(attrs, children);
    return component(attrs, children);
  };
}
