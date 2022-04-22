import { DOMElement, Updatable } from "../dom";
import { Link } from "./link";

export interface Router {
  current?: string;
  navigate: (url: string) => (event: Event) => void;
  (target: Updatable<DOMElement>): Updatable<DOMElement>;
}

let baseURI = `${document.baseURI}`;
const normalizeHref = () => {
  return location.href + "/" === baseURI ? baseURI : location.href;
};

let globalRouter: Router;
export const Router = {
  for(links: Link[], index: string, setGlobalRouter = true): Router {
    let target: Updatable<Element>;
    const partialRouter: Partial<Router> = (t: Updatable<Element>) => {
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
