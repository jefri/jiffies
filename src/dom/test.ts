import { IsBrowser } from "../is_browser.js";

export async function loadTests() {
  if (!IsBrowser) return;
  if (process?.env.CI?.toLowerCase() === "true") return;
  await Promise.all([
    import("./html.test.js"),
    import("./fc.test.js"),
    import("./observable.test.js"),
  ]);
}
