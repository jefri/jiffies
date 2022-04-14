import { a } from "../dom/html.js";
import { Router } from "./router.js";

export interface Link {
  href: string;
  link: string;
  target: () => Node;
}

export const link = ({ href, link }: Link) =>
  a(
    { href: Router.href(href), events: { click: () => Router.navigate(href) } },
    link
  );
