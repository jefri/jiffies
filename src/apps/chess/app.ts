import { header, li, main, nav, strong, ul } from "../../dom/html.js";
import { link } from "../../router/link.js";
import { Router } from "../../router/router.js";
import urls from "./urls.js";

export const App = () => {
  const router = Router.for(urls, "chess");

  const app = [
    header(
      { class: "container-fluid" },
      nav(ul(li(strong("Chess"))), ul(...urls.map((url) => li(link(url)))))
    ),
    router(main({ class: "container" })),
  ];
  return app;
};
