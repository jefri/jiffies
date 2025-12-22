import { map, Subject } from "../observable/observable.ts";
import { describe, it } from "../scope/describe.ts";
import { expect } from "../scope/expect.ts";
import type { DOMUpdates } from "./dom.ts";
import { div, span } from "./html.ts";
import { O } from "./observable.ts";

describe("DOM Observable", () => {
  it("updates a dom node with observable results", async () => {
    const subject = new Subject<string>();
    const observable = subject.pipe(map((s) => [s]));

    const element = O(div(), observable);

    expect(element.innerText).toEqual("");
    await subject.next("H");
    expect(element.innerText).toEqual("H");
    await subject.next("He");
    expect(element.innerText).toEqual("He");
  });

  it("updates a dom node's attributes", async () => {
    const classes = new Subject<string[]>();
    const observable = classes.map<DOMUpdates>((c) => [{ class: c.join(" ") }]);

    const element = O(span(), observable);

    expect(element.classList.contains("warning")).toBe(false);
    expect(element.classList.contains("error")).toBe(false);

    await classes.next(["warning"]);
    expect(element.classList.contains("warning")).toBe(true);
    expect(element.classList.contains("error")).toBe(false);

    await classes.next(["error"]);
    expect(element.classList.contains("warning")).toBe(true);
    expect(element.classList.contains("error")).toBe(true);

    await classes.next(["!warning", "!error"]);
    expect(element.classList.contains("warning")).toBe(false);
    expect(element.classList.contains("error")).toBe(false);
  });
});
