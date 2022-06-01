import { O } from "./observable.js";
import { Subject, operator } from "../observable/observable.js";
import { describe, it } from "../scope/describe.js";
import { expect } from "../scope/expect.js";
import { div } from "./html.js";

describe("DOM Observable", () => {
  it("updates a dom node with observable results", async () => {
    const subject = new Subject<string>();
    const observable = subject.pipe(operator.map((s) => [s]));

    const element = O(div(), observable);

    expect(element.innerText).toEqual("");
    await subject.next("H");
    expect(element.innerText).toEqual("H");
    await subject.next("He");
    expect(element.innerText).toEqual("He");
  });
});
