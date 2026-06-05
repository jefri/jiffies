import { XHTML_NAMESPACE_URI } from "./dom.ts";

export interface DocumentOptions {
  body: Node | Node[];
  head?: Node | Node[];
  lang?: string;
  doctype?: string;
}

export function renderToString(node: Node | Node[]): string {
  if (Array.isArray(node)) return node.map(renderToString).join("");
  if (node.nodeType === 1) {
    const el = node as Element;
    const html = el.outerHTML;
    const ns = el.namespaceURI;
    if (ns && ns !== XHTML_NAMESPACE_URI && !html.includes("xmlns=")) {
      return html.replace(/^<([^\s>]+)/, `<$1 xmlns="${ns}"`);
    }
    return html;
  }
  if (node.nodeType === 11)
    return Array.from(node.childNodes).map(renderToString).join("");
  if (node.nodeType === 3) {
    return (node.textContent ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  return "";
}

export function renderDocument({
  body,
  head,
  lang = "en",
  doctype = "<!doctype html>",
}: DocumentOptions): string {
  const headStr = head != null ? renderToString(head) : "";
  const bodyStr = renderToString(body);
  return `${doctype}<html lang="${lang}"><head>${headStr}</head><body>${bodyStr}</body></html>`;
}
