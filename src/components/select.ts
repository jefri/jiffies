import { EventHandler } from "../dom/dom"
import { FC } from "../dom/fc"
import { option, select } from "../dom/html"

export const Select = FC<{
  name: string;
  value: string;
  events: {
    change: EventHandler;
  };
  disabled: boolean;
  options: [string, string][];
}>(
  "jiffies-select",
  (el, { name, events: { change }, disabled, value, options }) =>
    select(
      { name, events: { change }, disabled },
      ...options.map(([v, name]) =>
        option({ value: v, selected: value === v }, `${name}`)
      )
    )
);
