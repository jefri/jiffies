import { FC } from "../dom/fc.js";
import { input, span } from "../dom/html.js";

const Mode = {
  VIEW: 0,
  EDIT: 1,
};

/**
 * @typedef InlineEditState
 * @property {number} mode
 * @property {string} value
 */

export const InlineEdit = FC(
  "inline-edit",
  /**
   * @param {HTMLElement & {state?: InlineEditState}} el
   * @param {
    {
      mode?: number,
      value: string,
      events: {
        change: (value: string) => void;
      }
    }} props
  */
  (el, { mode = Mode.VIEW, value, events }) => {
    const state = (el.state ??= { mode, value });

    const render = () => {
      switch (state.mode) {
        case Mode.EDIT:
          return edit();
        case Mode.VIEW:
          return view();
        default:
          return span();
      }
    };

    const view = () =>
      span(
        {
          style: { cursor: "text" },
          events: {
            click: () => {
              state.mode = Mode.EDIT;
              element.update(render());
            },
          },
        },
        state.value
      );

    const edit = () =>
      input({
        style: { zIndex: "10", position: "relative", marginTop: "-7px" },
        events: {
          blur: ({ target }) => events.change(target?.value ?? ""),
        },
        type: "text",
        value: state.value,
      });

    const element = span(render());
    return element;
  }
);

export default InlineEdit;
