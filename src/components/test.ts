import { IsBrowser } from "../is_browser.js";

export async function loadTests() {
  if (IsBrowser) await import("./virtual_scroll.browser-test.ts");
}
