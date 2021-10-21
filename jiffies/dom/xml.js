/**
 * @param {string} tag
 * @param {Record<string, string|number|boolean>} attributes
 * @param {string[]} children
 * @returns string
 */
export function xml(tag, attributes, children = []) {
  const attrs = Object.entries(attributes).reduce(
    (attrs, [attr, val]) => `${attrs} ${attr}="${val}"`,
    ""
  );
  const kids = children.join("");
  return `<${tag} ${attrs}>${kids}</${tag}>`;
}
