import { width } from "../dom/css/sizing.js";
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
   * @param {import("../dom/dom.js").Updatable<{state?: InlineEditState}>} el
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
          style: {
            cursor: "text",
            ...width("full", "inline"),
          },
          events: {
            click: () => {
              state.mode = Mode.EDIT;
              el.update(render());
            },
          },
        },
        state.value
      );

    const edit = () => {
      const edit = span(
        {
          style: {
            display: "block",
            position: "relative",
          },
        },
        input({
          style: {
            zIndex: "10",
            position: "absolute",
            left: "0",
            marginTop: "-0.375rem",
          },
          events: {
            blur: ({ target }) => events.change(target?.value ?? ""),
          },
          type: "text",
          value: state.value,
        }),
        "\u00a0" // Hack to get the span to take up space
      );
      setTimeout(() => {
        edit.focus();
      });
      return edit;
    };

    return render();
  }
);

export default InlineEdit;
