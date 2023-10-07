import { DOMElement } from "../dom.js";
import { Link } from "./link.js";

export interface Router {
  current?: string;
  navigate: (url: string) => (event: Event) => void;
  (target: DOMElement): DOMElement;
}

let baseURI = `${document.baseURI}`;
const normalizeHref = () => {
  return location.href + "/" === baseURI ? baseURI : location.href;
};

let globalRouter: Router;
export const Router = {
  local(links: Link[], index: string): Router {
    return Router.for(links, index, false);
  },
  for(links: Link[], index: string, setGlobalRouter = true): Router {
    let target: Element;
    const partialRouter: Partial<Router> = (t: Element) => {
      target = t;
      const href = normalizeHref();
      const route = href === baseURI ? baseURI + index : href;
      doNavigate(route);
      window.addEventListener("popstate", () => {
        doNavigate(location.href);
      });
      return target;
    };

    const doNavigate = (link: string) => {
      link = link.replace(baseURI, "") || index;
      if (link === partialRouter.current) {
        return false;
      }
      partialRouter.current = link;
      target.update(
        (
          links.find(({ href }) => link.endsWith(href))?.target ??
          (() => undefined)
        )()
      );
      return true;
    };

    const navigate = (url: string) => {
      return (event: Event) => {
        event.preventDefault();
        if (doNavigate(url || index)) {
          history.pushState(null, "", url);
        }
      };
    };

    partialRouter.navigate = navigate;

    if (setGlobalRouter) {
      globalRouter = partialRouter as Router;
    }
    return partialRouter as Router;
  },

  href(link: string) {
    return `${baseURI}${link.replace(/^\//, "")}`;
  },

  navigate(href: string) {
    return globalRouter?.navigate(href);
  },
};
