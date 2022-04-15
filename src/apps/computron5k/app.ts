import { header, li, main, nav, strong, ul } from "../../dom/html.js";
import { link } from "../../router/link.js";
import { Router } from "../../router/router.js";

import urls from "./urls.js";

export const App = () => {
  const router = Router.for(urls, "test");

  const app = [
    header(
      nav(
        ul(li(strong("CPU Emulator"))),
        ul(...urls.map((url) => li(link(url))))
      )
    ),
    router(main({ class: "container-fluid" })),
  ];
  return app;
};
