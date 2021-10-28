import { FC } from "../dom/fc.js";
import { option, select } from "../dom/html.js";

export const Select = FC(
  "jiffies-select",
  /**
   * @param HTMLElement el;
   * @param {{
    name: string,
    value: string,
    events: {
        change: import('../dom/dom.js').EventHandler
    },
    disabled: boolean,
    options: ([string, string])[],
   }} props
  */
  (el, { name, events: { change }, disabled, value, options }) =>
    select(
      {
        name,
        events: { change },
        disabled,
      },
      ...options.map(([v, name]) =>
        option(
          {
            value: v,
            selected: value === v,
          },
          `${name}`
        )
      )
    )
);
