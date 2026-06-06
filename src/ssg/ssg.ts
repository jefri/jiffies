import { buildPayload, captureStubSource } from "../dom/hydrate.ts";
import { renderToString } from "../dom/render.ts";
import type { FileSystem } from "../fs.ts";

/** Describes a page's default render function and optional metadata for the SSG build. */
export interface PageModule {
  default: (
    params?: Record<string, string>,
  ) => Node | Node[] | Promise<Node | Node[]>;
  head?: (
    params?: Record<string, string>,
  ) => Node | Node[] | Promise<Node | Node[]>;
  lang?: string;
  htmlAttributes?: Record<string, string>;
  clientModules?: string[];
  /**
   * Enumerate concrete param sets for dynamic route segments.
   * Required when any path segment is a [bracket] folder.
   */
  generateStaticParams?: () => Promise<Record<string, string>[]>;
}

/** Associates a URL route with its `PageModule` for the SSG build. */
export interface PageDescriptor {
  route: string;
  module: PageModule;
}

/** Options for a full SSG build: the set of pages to render, the output directory, and the filesystem adapter. */
export interface BuildOptions {
  pages: PageDescriptor[];
  out: string;
  fs: FileSystem;
}

/**
 * Walk `root` depth-first and return every element whose localName is a
 * defined custom element, in document order including nested ones. Descends
 * into matched elements so the full set of custom elements is returned.
 */
function scanAllUnits(root: ParentNode): Element[] {
  const results: Element[] = [];
  const stack: Element[] = [...root.children].reverse() as Element[];
  while (stack.length > 0) {
    const el = stack.pop() as Element;
    if (customElements.get(el.localName)) {
      results.push(el);
    }
    // Always descend — nested custom elements are included in the full set.
    for (let i = el.children.length - 1; i >= 0; i--) {
      stack.push(el.children[i] as Element);
    }
  }
  return results;
}

/**
 * Return true if el has a custom-element ancestor in the given units list.
 */
function isNested(el: Element, allUnits: Element[]): boolean {
  let parent = el.parentElement;
  while (parent !== null) {
    if (allUnits.includes(parent)) return true;
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Extract a Record<string,unknown> from an element's attribute list.
 */
function attrsToProps(el: Element): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attr of el.attributes) {
    props[attr.name] = attr.value;
  }
  return props;
}

export async function build({ pages, out, fs }: BuildOptions): Promise<void> {
  for (const { route, module } of pages) {
    const body = await module.default();
    const head = module.head ? await module.head() : undefined;

    let bodyStr = renderToString(body);
    let headStr = head != null ? renderToString(head) : "";

    const template = window.document.createElement("template");
    template.innerHTML = bodyStr;
    const allUnits = scanAllUnits(template.content);
    const props = allUnits.map(attrsToProps);

    if (props.length > 0) {
      const payload = buildPayload(props);
      headStr += `<script type="application/json" id="__hydration">${payload}</script>`;
    }

    const nestedUnits = allUnits.filter((el) => isNested(el, allUnits));
    const nestedTagNames = [...new Set(nestedUnits.map((el) => el.localName))];
    for (const tag of nestedTagNames) {
      // Replace opening tags: <tag> and <tag ...> with defer-hydration inserted.
      bodyStr = bodyStr.replace(
        new RegExp(`<(${tag})( |>)`, "g"),
        (_match: string, t: string, after: string) =>
          after === ">" ? `<${t} defer-hydration>` : `<${t} defer-hydration `,
      );
    }

    const clientModules = module.clientModules ?? [];
    if (allUnits.length > 0 || clientModules.length > 0) {
      bodyStr = `${bodyStr}<script>${captureStubSource}</script>`;
    }

    if (clientModules.length > 0) {
      const imports = clientModules.map((m) => `import "${m}";`).join("\n");
      bodyStr = `${bodyStr}<script type="module" defer>\n${imports}\n</script>`;
    }

    const lang = module.lang ?? "en";
    const extraAttrs = Object.entries(module.htmlAttributes ?? {})
      .map(([k, v]) => ` ${k}="${v}"`)
      .join("");
    const html = `<!doctype html><html lang="${lang}"${extraAttrs}><head>${headStr}</head><body>${bodyStr}</body></html>`;

    const segment = route.replace(/^\//, "");
    const dir = segment ? `${out}/${segment}` : out;
    const path = `${dir}/index.html`;
    await fs.mkdir(dir);
    await fs.writeFile(path, html);
  }
}
