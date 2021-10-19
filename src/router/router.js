/** @typedef {import('./link.js').Link} Link */

let baseURI = `${document.baseURI}`;
let router;
export const Router = {
  /**
   * @param {Link[]} links
   * @param {string} index
   */
  for(links, index) {
    /** @type {import('../dom/dom.js').Updatable<Node>} */
    let target;
    router = (/** @type {import('../dom/dom.js').Updatable<Node>} */ t) => {
      target = t;
      index = baseURI + index;
      doNavigate(index);
      window.addEventListener("popstate", () => {
        doNavigate(location.href);
      });
      return target;
    };

    /** @param {string} link */
    const doNavigate = (link) => {
      link = link.replace(baseURI, "") || index;
      target.update(
        (
          links.find(({ href }) => link.endsWith(href))?.target ??
          (() => undefined)
        )()
      );
    };

    const navigate = (/** @type {string} */ url) => {
      return (/** @type {Event} */ event) => {
        event.preventDefault();
        history.pushState(null, "", url);
        doNavigate(url || index);
      };
    };

    router.navigate = navigate;

    return router;
  },

  href(/** @type {string} */ link) {
    return `${baseURI}${link}`;
  },

  navigate(url) {
    return router?.navigate(url);
  },
};
