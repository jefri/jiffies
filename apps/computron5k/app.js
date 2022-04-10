import { header, li, main, nav, strong, ul } from "../../jiffies/dom/html.js";
import { link } from "../../jiffies/router/link.js";
import { Router } from "../../jiffies/router/router.js";

import urls from "./urls.js";

export const App = () => {
  const router = Router.for(urls, "test");

  const app = [
    header(
      // { class: "container-fluid" },
      nav(
        ul(li(strong("CPU Emulator"))),
        ul(...urls.map((url) => li(link(url))))
      )
    ),
    router(main({ class: "container-fluid" })),
  ];
  return app;
};
