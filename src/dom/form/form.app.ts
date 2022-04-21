import { button, div, small } from "../html.js";
import { Form, Input } from "./form.js";

const form = Form(
  {
    events: {
      submit(event) {
        console.log("Should see fields for firstname, lastname, email, etc");
        console.log(event);
      },
    },
  },
  div(
    { class: "grid" },
    Input({ id: "firstname", placeholder: "First name" }),
    Input({ id: "lastname", placeholder: "Last name" })
  ),
  Input(
    {
      id: "email",
      type: "email",
      placeholder: "Email address",
      required: true,
    },
    small("We will never share your email with anyone.")
  ),
  button({ type: "submit" }),
  div(
    { class: "grid" },
    Input({ id: "valid", placeholder: "Valid", ariaInvalid: "false" }),
    Input({ id: "invalid", placeholder: "Invalid", ariaInvalid: "true" }),
    Input({ id: "disabled", placeholder: "Disabled" }),
    Input({ id: "readonly", placeholder: "Readonly" })
  )
  // Dropdown({id: 'fruit', label: "Fruit", placeholder: "Select a fruit...", options: ['Banana', 'Watermelon', 'Apple', 'Orange', 'Mango']}),
  // Radios({legend: 'Size', options: {small: 'Small', medium: 'Medium', large: 'Large', extralarge: "Extra Large"}, checked: 'small'}),
  // Checkboxes({options: {terms: 'I agree to the Terms and Conditions', termsSharing: {label: 'I agree to share my information with partners', disabled: true, checked: true}}),
);

export default form;
