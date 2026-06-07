import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Alert, Card, jiffiesCssLink, Nav } from "./index.ts";

// Feature: a page author composes a jiffies-css page from the components module.
//
// They link one stylesheet via jiffiesCssLink() (never Pico), then build the page
// body by calling typed component functions. Each function emits the semantic
// structure jiffies-css targets by element type and ARIA role, so the author never
// hand-writes wrapper elements or class annotations.
describe("jiffies-css components feature", () => {
  it("composes a jiffies-css page with correct semantic structure and no Pico", () => {
    // Arrange / Act: build the page head link and body from the components module.
    const stylesheet = jiffiesCssLink();

    const view = main(
      Nav([
        { label: "Home", href: "/" },
        { label: "Settings", href: "/settings", current: true },
      ]),
      Card(
        { header: h2("Profile"), footer: small("Last saved 2m ago") },
        Alert("error", "Your session is about to expire."),
        p("Update your profile details."),
      ),
    );

    // Assert: one jiffies-css stylesheet link, never Pico.
    assert.strictEqual(stylesheet.tagName, "LINK");
    assert.strictEqual(stylesheet.getAttribute("rel"), "stylesheet");
    const href = stylesheet.getAttribute("href") ?? "";
    assert.match(href, /jiffies-css/);
    assert.doesNotMatch(href, /pico/i);

    // Assert: Card emits article > header + main + footer, in that order.
    const card = view.querySelector("article");
    assert.ok(card, "Card should render an <article>");
    const cardChildren = [...card.children].map((c) => c.tagName);
    assert.deepStrictEqual(cardChildren, ["HEADER", "MAIN", "FOOTER"]);
    assert.match(card.querySelector("header")?.textContent ?? "", /Profile/);
    assert.match(card.querySelector("footer")?.textContent ?? "", /Last saved/);

    // Assert: Card body content lives inside the required <main> wrapper.
    const cardBody = card.querySelector(":scope > main");
    assert.ok(cardBody, "Card body must be wrapped in <main>");
    assert.match(cardBody.textContent ?? "", /Update your profile details/);

    // Assert: Alert is aside[role=alert][data-variant=error] carrying the message.
    const alert = cardBody.querySelector("aside");
    assert.ok(alert, "Alert should render an <aside>");
    assert.strictEqual(alert.getAttribute("role"), "alert");
    assert.strictEqual(alert.getAttribute("data-variant"), "error");
    assert.match(alert.textContent ?? "", /session is about to expire/);

    // Assert: Nav emits nav > ol > li > a; current item is marked aria-current.
    const navLinks = [...view.querySelectorAll("nav > ol > li > a")];
    assert.deepStrictEqual(
      navLinks.map((l) => l.textContent),
      ["Home", "Settings"],
    );
    const current = navLinks.find((l) => l.getAttribute("aria-current"));
    assert.strictEqual(current?.getAttribute("aria-current"), "page");
    assert.strictEqual(current?.textContent, "Settings");

    // Assert: structure is enforced by element + role, not manual class annotation.
    assert.strictEqual(
      view.querySelectorAll("[class]").length,
      0,
      "components must not require manual class annotation",
    );
  });
});
