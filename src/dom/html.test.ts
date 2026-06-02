import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { button, table, tbody, td, th, thead, tr } from "./html.ts";

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
});
