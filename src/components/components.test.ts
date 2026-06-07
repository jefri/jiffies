import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Accordion,
  Alert,
  Breadcrumb,
  Card,
  Chip,
  FormGroup,
  jiffiesCssLink,
  Modal,
  Nav,
  Panel,
  PropertySheet,
  StaticTabList,
  TabList,
} from "./index.ts";

// A component satisfies the no-manual-class contract when neither it nor any of
// its descendants carries a class attribute.
function assertNoClass(root: Element): void {
  assert.strictEqual(root.getAttribute("class"), null, "root emits no class");
  assert.strictEqual(
    root.querySelectorAll("[class]").length,
    0,
    "no descendant emits a class",
  );
}

describe("jiffiesCssLink", () => {
  it("defaults to the jiffies-css CDN, never Pico", () => {
    const el = jiffiesCssLink();

    assert.strictEqual(el.tagName, "LINK");
    assert.strictEqual(el.getAttribute("rel"), "stylesheet");
    assert.match(el.getAttribute("href") ?? "", /jiffies-css/);
    assert.doesNotMatch(el.getAttribute("href") ?? "", /pico/i);
  });

  it("uses a caller-supplied href for local bundling", () => {
    const el = jiffiesCssLink("/assets/jiffies-css.css");

    assert.strictEqual(el.getAttribute("href"), "/assets/jiffies-css.css");
    assert.strictEqual(el.getAttribute("rel"), "stylesheet");
  });
});

describe("Card", () => {
  it("emits article > header / main / footer in order", () => {
    const card = Card(
      { header: h2("Profile"), footer: small("saved") },
      p("body"),
    );

    assert.strictEqual(card.tagName, "ARTICLE");
    assert.deepStrictEqual(
      [...card.children].map((c) => c.tagName),
      ["HEADER", "MAIN", "FOOTER"],
    );
  });

  it("always wraps body content in <main>, even with no parts", () => {
    const card = Card({}, p("just body"));

    assert.deepStrictEqual(
      [...card.children].map((c) => c.tagName),
      ["MAIN"],
    );
    assert.match(
      card.querySelector(":scope > main")?.textContent ?? "",
      /just body/,
    );
  });

  it("omits header when absent but keeps footer", () => {
    const card = Card({ footer: small("saved") }, p("body"));

    assert.deepStrictEqual(
      [...card.children].map((c) => c.tagName),
      ["MAIN", "FOOTER"],
    );
  });

  it("emits no class attribute", () => {
    const card = Card({ header: h2("h") }, p("body"));

    assertNoClass(card);
  });
});

describe("Panel", () => {
  it("is the flat variant: section > header / main / footer", () => {
    const panel = Panel(
      { header: h2("Stats"), footer: small("foot") },
      p("body"),
    );

    assert.strictEqual(panel.tagName, "SECTION");
    assert.deepStrictEqual(
      [...panel.children].map((c) => c.tagName),
      ["HEADER", "MAIN", "FOOTER"],
    );
    assertNoClass(panel);
  });
});

describe("Alert", () => {
  it("maps destructive variants (warning, error) to role=alert", () => {
    for (const variant of ["warning", "error"] as const) {
      const el = Alert(variant, "message");
      assert.strictEqual(el.tagName, "ASIDE");
      assert.strictEqual(el.getAttribute("role"), "alert");
      assert.strictEqual(el.getAttribute("data-variant"), variant);
    }
  });

  it("maps informational variants (info, success, neutral) to role=status", () => {
    for (const variant of ["info", "success", "neutral"] as const) {
      const el = Alert(variant, "message");
      assert.strictEqual(el.getAttribute("role"), "status");
      assert.strictEqual(el.getAttribute("data-variant"), variant);
    }
  });

  it("carries its children as the message and emits no class", () => {
    const el = Alert("error", "Disk full", p(" detail"));

    assert.match(el.textContent ?? "", /Disk full/);
    assert.match(el.textContent ?? "", /detail/);
    assertNoClass(el);
  });
});

describe("Chip", () => {
  it("emits small[data-variant] with no role and no class", () => {
    const el = Chip("warning", "beta");

    assert.strictEqual(el.tagName, "SMALL");
    assert.strictEqual(el.getAttribute("data-variant"), "warning");
    assert.strictEqual(el.getAttribute("role"), null);
    assert.match(el.textContent ?? "", /beta/);
    assertNoClass(el);
  });
});

describe("Nav", () => {
  it("emits nav > ol > li > a with one li per item and marks the current item", () => {
    const el = Nav([
      { label: "Home", href: "/" },
      { label: "Docs", href: "/docs", current: true },
    ]);

    assert.strictEqual(el.tagName, "NAV");
    const links = [...el.querySelectorAll("nav > ol > li > a")];
    assert.deepStrictEqual(
      links.map((l) => l.textContent),
      ["Home", "Docs"],
    );
    assert.strictEqual(links[0].getAttribute("href"), "/");
    assert.strictEqual(links[1].getAttribute("aria-current"), "page");
    assert.strictEqual(links[0].getAttribute("aria-current"), null);
    assertNoClass(el);
  });

  it("omits href on an item that has none", () => {
    const el = Nav([{ label: "Plain" }]);

    const link = el.querySelector("a");
    assert.strictEqual(link?.getAttribute("href"), null);
    assert.strictEqual(link?.textContent, "Plain");
  });
});

describe("Breadcrumb", () => {
  it("wraps the nav > ol > li chain in a span", () => {
    const el = Breadcrumb([
      { label: "Home", href: "/" },
      { label: "Here", current: true },
    ]);

    assert.strictEqual(el.tagName, "SPAN");
    const links = [...el.querySelectorAll("span > nav > ol > li > a")];
    assert.deepStrictEqual(
      links.map((l) => l.textContent),
      ["Home", "Here"],
    );
    assert.strictEqual(links[1].getAttribute("aria-current"), "page");
    assertNoClass(el);
  });
});

describe("Accordion", () => {
  it("emits details > summary + body with summary first", () => {
    const acc = Accordion("Details", p("hidden body"));

    assert.strictEqual(acc.tagName, "DETAILS");
    assert.strictEqual(acc.children[0]?.tagName, "SUMMARY");
    assert.match(acc.querySelector("summary")?.textContent ?? "", /Details/);
    assert.match(acc.textContent ?? "", /hidden body/);
    assertNoClass(acc);
  });
});

describe("Modal", () => {
  it("emits a dialog carrying the children and an update() method", () => {
    const m = Modal(p("dialog body"));

    assert.strictEqual(m.tagName, "DIALOG");
    assert.match(m.textContent ?? "", /dialog body/);
    assert.strictEqual(typeof m.update, "function");
    assertNoClass(m);
  });
});

describe("PropertySheet", () => {
  it("emits dl > (dt + dd)* one pair per entry, value may be a node", () => {
    const sheet = PropertySheet(
      { label: "Name", value: "Ada" },
      { label: "Role", value: strong("Admin") },
    );

    assert.strictEqual(sheet.tagName, "DL");
    assert.deepStrictEqual(
      [...sheet.children].map((c) => c.tagName),
      ["DT", "DD", "DT", "DD"],
    );
    assert.match(sheet.children[0]?.textContent ?? "", /Name/);
    assert.match(sheet.children[1]?.textContent ?? "", /Ada/);
    assert.strictEqual(
      sheet.querySelector("dd > strong")?.textContent,
      "Admin",
    );
    assertNoClass(sheet);
  });
});

describe("FormGroup", () => {
  it("emits fieldset[role=group] > legend + children", () => {
    const group = FormGroup("Pick one", input({ type: "radio", name: "x" }));

    assert.strictEqual(group.tagName, "FIELDSET");
    assert.strictEqual(group.getAttribute("role"), "group");
    assert.strictEqual(group.children[0]?.tagName, "LEGEND");
    assert.match(group.querySelector("legend")?.textContent ?? "", /Pick one/);
    assertNoClass(group);
  });
});

describe("TabList", () => {
  it("emits div[role=tablist] > button[role=tab], marks selected and wires onSelect", () => {
    let clicked = 0;
    const tabs = TabList(
      { label: "One", selected: true },
      {
        label: "Two",
        onSelect: () => {
          clicked += 1;
        },
      },
    );

    assert.strictEqual(tabs.getAttribute("role"), "tablist");
    const buttons = [...tabs.querySelectorAll("button[role=tab]")];
    assert.strictEqual(buttons.length, 2);
    assert.strictEqual(buttons[0]?.getAttribute("aria-selected"), "true");
    assert.strictEqual(buttons[1]?.getAttribute("aria-selected"), null);
    (buttons[1] as HTMLButtonElement).click();
    assert.strictEqual(clicked, 1);
    assertNoClass(tabs);
  });
});

describe("StaticTabList", () => {
  it("emits grouped radio + label[role=tab] pairs with id/for and defaultChecked", () => {
    const tabs = StaticTabList(
      "view",
      { id: "a", label: "Alpha", selected: true },
      { id: "b", label: "Beta" },
    );

    assert.strictEqual(tabs.getAttribute("role"), "tablist");
    const radios = [
      ...tabs.querySelectorAll("input[type=radio]"),
    ] as HTMLInputElement[];
    assert.strictEqual(radios.length, 2);
    assert.strictEqual(radios[0]?.getAttribute("name"), "view");
    assert.strictEqual(radios[0]?.getAttribute("id"), "a");
    assert.strictEqual(radios[0]?.defaultChecked, true);
    assert.strictEqual(radios[1]?.defaultChecked, false);
    const labels = [...tabs.querySelectorAll("label[role=tab]")];
    assert.strictEqual(labels[0]?.getAttribute("for"), "a");
    assert.match(labels[0]?.textContent ?? "", /Alpha/);
    assertNoClass(tabs);
  });
});
