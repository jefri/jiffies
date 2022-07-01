import { a } from "../html"
import { Router } from "./router"

export interface Link {
  href: string;
  link: string;
  target: () => Node;
}

export const link = ({ href, link }: Link) =>
  a(
    { href: Router.href(href), events: { click: Router.navigate(href) } },
    link
  );
