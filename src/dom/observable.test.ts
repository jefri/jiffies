import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { map, Subject } from "../observable/observable.ts";
import type { DOMUpdates } from "./dom.ts";
import { div, span } from "./html.ts";
import { O } from "./observable.ts";

describe("DOM Observable", () => {
  it("updates a dom node with observable results", async () => {
    const subject = new Subject<string>();
    const observable = subject.pipe(map((s) => [s]));

    const element = O(div(), observable);

    assert.strictEqual(element.textContent, "");
    await subject.next("H");
    assert.strictEqual(element.textContent, "H");
    await subject.next("He");
    assert.strictEqual(element.textContent, "He");
  });

  it("updates a dom node's attributes", async () => {
    const classes = new Subject<string[]>();
    const observable = classes.map<DOMUpdates>((c) => [{ class: c.join(" ") }]);

    const element = O(span(), observable);

    assert.ok(!element.classList.contains("warning"));
    assert.ok(!element.classList.contains("error"));

    await classes.next(["warning"]);
    assert.ok(element.classList.contains("warning"));
    assert.ok(!element.classList.contains("error"));

    await classes.next(["error"]);
    assert.ok(element.classList.contains("warning"));
    assert.ok(element.classList.contains("error"));

    await classes.next(["!warning", "!error"]);
    assert.ok(!element.classList.contains("warning"));
    assert.ok(!element.classList.contains("error"));
  });
});
