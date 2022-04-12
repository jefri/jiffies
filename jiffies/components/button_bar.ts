import { Display, display } from "../display.js";
import { FC } from "../dom/fc.js";
import { a, li, ul } from "../dom/html.js";

const ButtonBar = FC(
  "button-bar",
  <T extends Display>(
    el: HTMLElement,
    {
      value,
      values,
      events,
    }: { value: T; values: T[]; events: { onSelect: (current: T) => void } }
  ) =>
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
            display(option)
          )
        )
      )
    )
);

export default ButtonBar;
