import { link } from "../dom/html";

const JIFFIES_CSS_CDN =
  "https://unpkg.com/@davidsouther/jiffies-css/dist/index.css";

// jiffiesCssLink builds the <link> a page puts in <head> to load jiffies-css.
// Why: callers must never hand-write the CDN URL or accidentally point at Pico;
// this is the single sanctioned source of the stylesheet href.
// Invariant: returns a <link rel="stylesheet"> whose href contains "jiffies-css"
// and never "pico". Default href is the unpkg CDN; callers bundling locally pass
// their own href.
export function jiffiesCssLink(href = JIFFIES_CSS_CDN): HTMLLinkElement {
  return link({ rel: "stylesheet", href });
}
