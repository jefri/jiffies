/**
 * @typedef Link
 * @property {string} href
 * @property {string} link
 * @property {() => Node} target
 */

import { a } from "../dom/html.ts";
import { Router } from "./router.js";

/**
 * @param {Link} link
 */
export const link = ({ href, link }) =>
  a(
    { href: Router.href(href), events: { click: Router.navigate(href) } },
    link
  );
