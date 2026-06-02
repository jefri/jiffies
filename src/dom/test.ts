import { IsBrowser } from "../is_browser.js";

export async function loadTests() {
  if (!IsBrowser) return;
  if (process?.env.CI?.toLowerCase() === "true") return;
  await Promise.all([
    import("./html.browser-test.js"),
    import("./fc.browser-test.js"),
    import("./observable.browser-test.js"),
  ]);
}
