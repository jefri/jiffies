import { a, li, nav, ol, span } from "../dom/html.ts";

export interface NavItem {
  label: string;
  href?: string;
  current?: boolean;
}

// One <li><a> per item. aria-current is set with setAttribute (aria-* is not in
// the typed attrs surface); the anchor carries href only when the item supplies one.
function navItem(item: NavItem): HTMLElement {
  const anchor = a(item.href ? { href: item.href } : {}, item.label);
  if (item.current) {
    anchor.setAttribute("aria-current", "page");
  }
  return li(anchor);
}

function navList(items: NavItem[]): HTMLElement {
  return ol(...items.map(navItem));
}

// Nav emits nav > ol > li > a, one <li> per item.
// Why: jiffies-css targets the nav > ol > li > a chain; a bare ul > li > a is unstyled.
// Invariants: every item is an <a> inside an <li> inside the single <ol>; an item
// with current:true gets aria-current="page" on its <a>; emits no class attribute.
export function Nav(items: NavItem[]): HTMLElement {
  return nav(navList(items));
}

// Breadcrumb wraps the same nav > ol > li chain in a <span> (span > nav > ol > li),
// the jiffies-css breadcrumb selector. Same file, same pattern. Not exercised by
// the feature test.
export function Breadcrumb(items: NavItem[]): HTMLElement {
  return span(nav(navList(items)));
}
