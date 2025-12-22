import type { EventHandler } from "../dom/dom.ts";
import { FC } from "../dom/fc.ts";
import { option, select } from "../dom/html.ts";

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
  (_el, { name, events: { change }, disabled, value, options }) =>
    select(
      { name, events: { change }, disabled },
      ...options.map(([v, name]) =>
        option({ value: v, selected: value === v }, `${name}`),
      ),
    ),
);
