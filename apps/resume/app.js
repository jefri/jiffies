import { footer, h1, main, header } from "../../jiffies/dom/html";
import { Resume, AboutMe } from "./resume";

export const App = () => {
  const title = header(h1("Resume"));
  const body = main({ ariaBusy: "true" });
  const pageFooter = footer("© David Souther 2022");

  fetch("./resume.json").then(async (result) => {
    if (result.ok) {
      const resume = await result.json();
      title.update(...AboutMe(resume.aboutMe));
      body.update({ ariaBusy: "" }, Resume(resume));
    } else {
      body.update({ ariaBusy: "" }, "Failed to load resume!");
    }
  });

  const app = [title, body, pageFooter];
  return app;
};
