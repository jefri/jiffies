import { jiffiesCssLink } from "../../src/dom/components/index.ts";
import {
  article,
  aside,
  code,
  h1,
  h2,
  header,
  kbd,
  li,
  main,
  meta,
  p,
  section,
  small,
  strong,
  title,
  ul,
} from "../../src/dom/html.ts";
import type { PageModule } from "../../src/dom/ssg.ts";
import { ClickCounter, LikeButton } from "./components.ts";

function pageHead(): Node[] {
  return [
    meta({ charset: "utf-8" }),
    meta({ name: "viewport", content: "width=device-width, initial-scale=1" }),
    title("Jiffies Hydration Demo"),
    jiffiesCssLink(),
  ];
}

function pageBody(renderedAt: string): Node[] {
  return [
    header(
      { class: "container" },
      h1("Jiffies Hydration Demo"),
      p(
        "Server rendered at: ",
        strong(renderedAt),
        ". Hydrated in-place — no flash, no lost state.",
      ),
    ),
    main(
      { class: "container" },

      // ── M1 + M3: FC adopt with server props ──────────────────────────────
      section(
        { class: "grid" },
        article(
          h2("Click Counter"),
          p(small("M1 FC adopt · M3 state channel · M4 event capture")),
          p(
            "This counter starts at ",
            strong("5"),
            " — the initial count is carried from server to client in the ",
            code("__hydration"),
            " JSON payload. Click before the module loads and the click is queued and replayed.",
          ),
          ClickCounter({ count: 5 }),
        ),

        article(
          h2("Like Button"),
          p(small("M1 FC adopt")),
          p(
            "A simple toggle FC. After hydration, clicking toggles between ",
            kbd("♡ Like"),
            " and ",
            kbd("♥ Liked"),
            ".",
          ),
          LikeButton({}),
        ),
      ),

      // ── M4: capture-and-replay instructions ──────────────────────────────
      section(
        h2("Testing event capture & replay (M4)"),
        p(
          "To see M4 in action, open DevTools → Network → throttle to ",
          strong("Slow 3G"),
          ", then reload. Click the counter immediately. The click fires ",
          em("before"),
          " the client module finishes loading, is captured by the inline stub, and is replayed the moment hydration completes.",
        ),
        ul(
          li("The inline capture stub runs at first paint — no module needed."),
          li(
            "Events targeting un-hydrated custom elements land in ",
            code("window.__hydrateQueue"),
            ".",
          ),
          li(
            "After each FC hydrates, its queued events are re-dispatched on the resolved live nodes.",
          ),
        ),
      ),

      // ── M2: hydrateRoot note ─────────────────────────────────────────────
      aside(
        p(
          small(
            strong("Note:"),
            " This page uses ",
            code("start()"),
            " (M1 — individual FC island mode). For whole-app reconcile without custom elements, use ",
            code("hydrateRoot(mount, render)"),
            " (M2) instead.",
          ),
        ),
      ),
    ),
  ];
}

// Using `em` which isn't auto-imported above — quick inline helper
function em(...children: (string | Node)[]): Element {
  const el = window.document.createElement("em");
  for (const c of children) {
    el.append(typeof c === "string" ? c : c);
  }
  return el;
}

const module: PageModule = {
  default: () => pageBody(new Date().toISOString()),
  head: () => pageHead(),
  lang: "en",
  clientModules: ["/demo/hydration/client.ts"],
};

export default module;
