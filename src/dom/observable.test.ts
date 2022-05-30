import { o } from "./observable.js";
import { Observable, Subject } from "../observable/observable.js";
import { describe, it } from "../scope/describe.js";
import { expect } from "../scope/expect.js";
import { div } from "./html.js";

describe("DOM Observable", () => {
  it("updates a dom node with observable results", async () => {
    const t = new Subject<string>();
    const d = o(div, t);
    expect(d.innerText).toEqual("");
    t.next("H");
    expect(d.innerText).toEqual("H");
    t.next("He");
    expect(d.innerText).toEqual("He");
  });
});
