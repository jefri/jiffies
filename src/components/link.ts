import type { Attrs } from "../dom/dom.ts";
import { link } from "../dom/html.ts";

const JIFFIES_CSS_CDN =
  "https://unpkg.com/@davidsouther/jiffies-css/dist/index.css";

// jiffiesCssLink props: an optional href override plus any DOM attrs (lang,
// media, ...) to apply to the <link>.
export type JiffiesCssLinkProps = { href?: string } & Attrs<HTMLLinkElement>;

// jiffiesCssLink builds the <link> a page puts in <head> to load jiffies-css.
// Why: callers must never hand-write the CDN URL or accidentally point at Pico;
// this is the single sanctioned source of the stylesheet href.
// Invariant: returns a <link rel="stylesheet"> whose href contains "jiffies-css"
// and never "pico". Default href is the unpkg CDN; callers bundling locally pass
// their own href.
export function jiffiesCssLink({
  href = JIFFIES_CSS_CDN,
  ...attrs
}: JiffiesCssLinkProps = {}): HTMLLinkElement {
  return link({ ...attrs, rel: "stylesheet", href });
}
