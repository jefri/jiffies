import type { FileSystem } from "../fs.ts";
import { type DocumentOptions, renderDocument } from "./render.ts";

export interface PageModule {
  default: () => Node | Node[] | Promise<Node | Node[]>;
  head?: () => Node | Node[] | Promise<Node | Node[]>;
  lang?: string;
}

export interface PageDescriptor {
  route: string;
  module: PageModule;
}

export interface BuildOptions {
  pages: PageDescriptor[];
  out: string;
  fs: FileSystem;
}

export async function build({ pages, out, fs }: BuildOptions): Promise<void> {
  for (const { route, module } of pages) {
    const body = await module.default();
    const head = module.head ? await module.head() : undefined;
    const opts: DocumentOptions = { body };
    if (head !== undefined) opts.head = head;
    if (module.lang !== undefined) opts.lang = module.lang;
    const html = renderDocument(opts);
    const segment = route.replace(/^\//, "");
    const path = segment ? `${out}/${segment}/index.html` : `${out}/index.html`;
    await fs.writeFile(path, html);
  }
}
