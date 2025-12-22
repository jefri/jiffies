import { describe, expect, it } from "../scope/index.ts";
import { FC } from "./fc.ts";
import { button, div, form, input, label, small } from "./html.ts";

describe("FC", () => {
  it("creates FCs", () => {
    const Input = FC<{
      placeholder: string;
      name: string;
      required?: boolean;
      type?: string;
    }>("fc-input", (_el, attrs, children) =>
      label(attrs.placeholder ?? attrs.name, input(attrs), ...children),
    );

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

    // document.body.appendChild(f);
    expect(f.children.length).toBe(3);
    expect(f.querySelectorAll("input[required]").length).toBe(2);
    expect(f.querySelectorAll('input[name="firstName"]').length).toBe(1);
  });
});
