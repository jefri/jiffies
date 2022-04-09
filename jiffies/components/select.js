import { FC } from "../dom/fc.ts";
import { option, select } from "../dom/html.ts";

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
			{ name, events: { change }, disabled },
			...options.map(
				([v, name]) => option({ value: v, selected: value === v }, `${name}`),
			),
		),
);
