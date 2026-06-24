import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GlobalAttrs } from "./dom.ts";
import {
  button,
  div,
  input,
  label,
  table,
  tbody,
  td,
  th,
  thead,
  tr,
} from "./html.ts";

describe("html", () => {
  it("creates HTML Elements", () => {
    const tableBody = tbody();
    const tableHead = thead(tr(th("Col A"), th("Col B")));
    const myTable = table(tableHead, tableBody);
    for (let x = 1; x <= 3; x++) {
      tableBody.appendChild(tr(td(`${x}`), td(`${x * 2}`)));
    }
    assert.strictEqual(myTable.textContent, "Col ACol B122436");
  });

  it("attaches event handlers", () => {
    let clicked = 0;
    const btn = button({
      events: {
        click: () => {
          clicked += 1;
        },
      },
    });
    btn.dispatchEvent(new Event("click"));
    assert.strictEqual(clicked, 1);
  });

  it("removes event handlers", () => {
    let clicked = 0;
    const btn = button({
      events: {
        click: () => {
          clicked += 1;
        },
      },
    });
    btn.dispatchEvent(new Event("click"));

    assert.strictEqual(clicked, 1);

    btn.update({ events: { click: null } });
    btn.dispatchEvent(new Event("click"));
    assert.strictEqual(clicked, 1);
  });

  it("replaces event handler on update", () => {
    let count = 0;
    const handler1 = () => {
      count += 1;
    };
    const handler2 = () => {
      count += 10;
    };
    const btn = button({ events: { click: handler1 } });
    btn.update({ events: { click: handler2 } });
    btn.dispatchEvent(new Event("click"));
    assert.strictEqual(count, 10);
  });

  it("sets style properties", () => {
    const btn = button({
      style: { flexDirection: "column" },
    });

    assert.strictEqual(btn.style.flexDirection, "column");
  });

  it("sets style, attributes, and events together", () => {
    let clicked = false;
    const btn = button({
      class: "test-class",
      style: { flexDirection: "column" },
      events: {
        click: () => {
          clicked = true;
        },
      },
    });
    btn.dispatchEvent(new Event("click"));

    assert.ok(btn.classList.contains("test-class"));
    assert.strictEqual(btn.style.flexDirection, "column");
    assert.ok(clicked);
  });

  it("accepts the GlobalAttrs aliases (data-*, aria-*, for, role) with no cast", () => {
    // Before the supplemental-attrs typing, none of these keys were named on the
    // element's own property type, so each call needed a `as` cast to widen the
    // literal. They are now in every builder's accepted attrs and written
    // verbatim.
    const lbl = label({ for: "email" }, "Email");
    const group = div({ role: "group", "data-value": "galilean" });
    const field = input({
      type: "checkbox",
      "data-var": "--ground",
      "aria-label": "Background",
    });

    assert.strictEqual(lbl.getAttribute("for"), "email");
    assert.strictEqual(group.getAttribute("role"), "group");
    assert.strictEqual(group.getAttribute("data-value"), "galilean");
    assert.strictEqual(field.getAttribute("data-var"), "--ground");
    assert.strictEqual(field.getAttribute("aria-label"), "Background");
  });

  it("accepts a supplemental attrs type parameter S for extra verbatim keys", () => {
    // The `S` hook names extra attributes inline without widening every key. Here
    // a caller declares a bespoke `data-custom` payload via S; the engine writes
    // it like any other attribute.
    const el = div<{ "data-custom": string }>({ "data-custom": "x" });
    assert.strictEqual(el.getAttribute("data-custom"), "x");

    // GlobalAttrs is exported so callers can name the alias set explicitly.
    const typed: GlobalAttrs = { "data-value": "1", for: "y" };
    const reuse = div(typed);
    assert.strictEqual(reuse.getAttribute("data-value"), "1");
    assert.strictEqual(reuse.getAttribute("for"), "y");
  });
});
