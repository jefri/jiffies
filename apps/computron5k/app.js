import { header, li, main, nav, strong, ul } from "../../src/dom/html.js";
import { link } from "../../src/router/link.js";
import { Router } from "../../src/router/router.js";

import urls from "./urls.js";

export const App = () => {
  const router = Router.for(urls, "cpu");

  const app = [
    header(
      { class: "container-fluid" },
      nav(
        ul(li(strong("CPU Emulator"))),
        ul(...urls.map((url) => li(link(url))))
      )
    ),
    router(main({ class: "container" })),
  ];
  return app;
};
