export function xml(
  tag: string,
  attributes: Record<string, string | number | boolean>,
  children: string[] = []
) {
  const attrs = Object.entries(attributes).reduce(
    (attrs, [attr, val]) => `${attrs} ${attr}="${val}"`,
    ""
  );
  const kids = children.join("");
  return `<${tag} ${attrs}>${kids}</${tag}>`;
}
