import { a } from "../html.ts";
import { Router } from "./router.ts";

export interface Link {
  href: string;
  link: string;
  target: () => Node;
}

export const link = ({ href, link }: Link) =>
  a(
    { href: Router.href(href), events: { click: Router.navigate(href) } },
    link,
  );
