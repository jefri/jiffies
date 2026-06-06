import { button, div, main, small } from "../html.ts";
import { Form, Input } from "./form.ts";

export const App = () =>
  main(
    Form(
      {
        events: {
          submit(event) {
            console.log(
              "Should see fields for firstname, lastname, email, etc",
            );
            console.log(event);
          },
        },
      },
      div(
        { class: "grid" },
        Input({ id: "firstname", placeholder: "First name" }),
        Input({ id: "lastname", placeholder: "Last name" }),
      ),
      Input(
        {
          id: "email",
          type: "email",
          placeholder: "Email address",
          required: true,
        },
        small("We will never share your email with anyone."),
      ),
      button({ type: "submit" }, "Submit"),
      div(
        { class: "grid" },
        Input({ id: "valid", placeholder: "Valid", "aria-invalid": "false" }),
        Input({
          id: "invalid",
          placeholder: "Invalid",
          "aria-invalid": "true",
        }),
        Input({ id: "disabled", placeholder: "Disabled", disabled: true }),
        Input({ id: "readonly", value: "Readonly", readOnly: true }),
      ),
    ),
  );
