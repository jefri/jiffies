import { describe, it } from "../scope/describe.js";
import { expect } from "../scope/expect.js";
import { table, tbody, td, th, thead, tr } from "./html.js";

describe("html", () => {
  it("creates HTML Elements", () => {
    let tableBody;
    const myTable = table(
      thead(tr(th("Col A"), th("Col B"))),
      (tableBody = tbody())
    );
    for (let x = 1; x <= 3; x++) {
      tableBody.appendChild(tr(td(`${x}`), td(`${x * 2}`)));
    }
    expect(myTable.textContent).toEqual("Col ACol B122436");
  });
});
