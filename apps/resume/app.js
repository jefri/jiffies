import { compileFStyle } from "../../jiffies/dom/css/fstyle.js";
import {
  footer,
  h1,
  main,
  header,
  style,
  cite,
  a,
  span,
} from "../../jiffies/dom/html.js";
import { Resume, AboutMe } from "./resume.js";

export const App = () => {
  const title = header(h1("Resume"));
  const body = main({ ariaBusy: "true" });
  const pageFooter = footer(
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
      },
    },
    "© David Souther 2022",
    cite(
      a(
        {
          href: "https://github.com/jefri/jefri-jiffies/tree/master/apps/resume",
        },
        "Page Source",
        span({ class: "print-only" }, ": github.com/jefri/jiffies/apps/resume")
      )
    )
  );

  fetch("./resume.json").then(async (result) => {
    if (result.ok) {
      const resume = await result.json();
      title.update(...AboutMe(resume.aboutMe));
      body.update({ ariaBusy: "" }, ...Resume(resume));
    } else {
      body.update({ ariaBusy: "" }, "Failed to load resume!");
    }
  });

  const app = [title, body, pageFooter];
  return app;
};
