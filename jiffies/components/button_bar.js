import { FC } from "../dom/fc.js";
import { a, li, ul } from "../dom/html.js";

const ButtonBar = FC(
  "button-bar",
  /**
   * @template {string} T
   * @param {HTMLElement} el
   * @param {{
      value: T;
      values: T[];
      events: {
        click: (current: T) => void;
      }
    }}  props
  */
  (el, { value, values, events }) =>
    ul(
      { class: "ButtonBar__wrapper" },
      ...values.map((option) =>
        li(
          a(
            {
              href: "#",
              class: `ButtonBar__${`${option}`
                .replace(/\s+/g, "_")
                .toLowerCase()}
                ${option === value ? "" : "secondary"}
                `.replace(/[\n\s]+/, " "),
              events: {
                click: (e) => {
                  e.preventDefault();
                  events.click(option);
                },
              },
            },
            option
          )
        )
      )
    )
);

export default ButtonBar;
