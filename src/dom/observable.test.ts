import { O } from "./observable"
import { Subject, map } from "../observable/observable"
import { describe, it } from "../scope/describe"
import { expect } from "../scope/expect"
import { div, span } from "./html"
import { DOMUpdates } from "./dom"

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
