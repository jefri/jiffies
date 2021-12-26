import { FC } from "../dom/fc.ts";
import { a, li, ul } from "../dom/html.ts";

const ButtonBar = FC(
  "button-bar",
  /**
   * @template {string} T
   * @param {HTMLElement} el
   * @param {{
      value: T;
      values: T[];
      events: {
        onSelect: (current: T) => void;
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
                  events.onSelect(option);
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
