import { a, li, ul } from "../dom/html.js";

/**
 * @template {string} T
 * @param {{
    value: T;
    values: T[];
    events: {
      click: (current: T) => void;
    }
  }}  props
 */
const ButtonBar = ({ value, values, events }) =>
  ul(
    { class: "ButtonBar__wrapper" },
    ...values.map((option, i) =>
      li(
        a(
          {
            href: "#",
            class: `ButtonBar__${`${option}`.replace(/\s+/g, "_").toLowerCase()}
                ${option === value ? "" : "secondary"}
                `.replace(/[\n\s]+/, " "),
            events: {
              click: () => events.click(option),
            },
          },
          option
        )
      )
    )
  );

export default ButtonBar;
