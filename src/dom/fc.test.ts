import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FC } from "./fc.ts";
import { button, div, form, input, label, small } from "./html.ts";

const Input = FC<{
  placeholder: string;
  name: string;
  required?: boolean;
  type?: string;
}>("fc-input", (_el, attrs, children) =>
  label(attrs.placeholder ?? attrs.name, input(attrs), ...children),
);

describe("FC", () => {
  it("creates FCs", () => {
    const f = form(
      { action: "#", method: "POST" },
      div(
        { class: "grid" },
        Input({
          name: "firstName",
          placeholder: "First Name",
          required: true,
        }),
        Input({
          name: "lastName",
          placeholder: "Last Name",
          required: true,
        }),
      ),
      Input(
        { name: "email", type: "email", placeholder: "E-Mail" },
        small("We'll never share your information."),
      ),
      button({ type: "submit" }, "Submit"),
    );

    assert.strictEqual(f.children.length, 3);
    assert.strictEqual(f.querySelectorAll("input[required]").length, 2);
    assert.strictEqual(f.querySelectorAll('input[name="firstName"]').length, 1);
  });
});
