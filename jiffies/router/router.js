/** @typedef {import('./link.js').Link} Link */
/** @typedef {import('../dom/dom.js').Updatable<Node>} UNode */

/**
 * @typedef {(target: UNode) => UNode} Router
 * @property {string=} current
 * @property {(url: string) = (event: Event) => void} navigate
 */

let baseURI = `${document.baseURI}`;
const normalizeHref = () => {
  return location.href + "/" === baseURI ? baseURI : location.href;
};

/** @type Router */
let router;
export const Router = {
  /**
   * @param {Link[]} links
   * @param {string} index
   */
  for(links, index) {
    /** @type {UNode} */
    let target;
    router = (/** @type {UNode} */ t) => {
      target = t;
      const href = normalizeHref();
      const route = href === baseURI ? baseURI + index : href;
      doNavigate(route);
      window.addEventListener("popstate", () => {
        doNavigate(location.href);
      });
      return target;
    };

    /** @param {string} link */
    const doNavigate = (link) => {
      link = link.replace(baseURI, "") || index;
      if (link === router.current) return false;
      router.current = link;
      target.update(
        (
          links.find(({ href }) => link.endsWith(href))?.target ??
          (() => undefined)
        )()
      );
      return true;
    };

    const navigate = (/** @type {string} */ url) => {
      return (/** @type {Event} */ event) => {
        event.preventDefault();
        if (doNavigate(url || index)) {
          history.pushState(null, "", url);
        }
      };
    };

    router.navigate = navigate;

    return router;
  },

  href(/** @type {string} */ link) {
    return `${baseURI}${link.replace(/^\//, "")}`;
  },

  navigate(/** @type string */ url) {
    return router?.navigate(url);
  },
};
