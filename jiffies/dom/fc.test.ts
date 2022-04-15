import { describe, it, expect } from "../scope/index.js";
import { FC } from "./fc.js";
import { button, div, form, input, label, small } from "./html.js";

describe("FC", () => {
  it("creates FCs", () => {
    const Input = FC<{
      placeholder: string;
      name: string;
      required?: boolean;
      type?: string;
    }>("fc-input", (el, attrs, children) => {
      const field = input(attrs);
      const block = label(attrs.placeholder ?? attrs.name, field, ...children);
      return block;
    });

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
        })
      ),
      Input(
        { name: "email", type: "email", placeholder: "E-Mail" },
        small("We'll never share your information.")
      ),
      button({ type: "submit" }, "Submit")
    );

    // document.body.appendChild(f);
    expect(f.children.length).toBe(3);
    expect(f.querySelectorAll("input[required]").length).toBe(2);
    expect(f.querySelectorAll('input[name="firstName"]').length).toBe(1);
  });
});
