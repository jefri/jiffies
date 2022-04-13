import { width } from "../dom/css/sizing.js";
import { Updatable } from "../dom/dom.js";
import { FC } from "../dom/fc.js";
import { input, span } from "../dom/html.js";

const Mode = { VIEW: 0, EDIT: 1 };

export interface InlineEditState {
  mode: number;
  value: string;
}

export const InlineEdit = FC(
  "inline-edit",
  (
    el: Updatable<HTMLElement & { state?: InlineEditState }>,
    {
      mode = Mode.VIEW,
      value,
      events,
    }: {
      mode?: number;
      value: string;
      events: {
        change: (value: string) => void;
      };
    }
  ) => {
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
          style: { cursor: "text", ...width("full", "inline") },
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
        { style: { display: "block", position: "relative" } },
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
