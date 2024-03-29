import { width } from "../dom/css/sizing.js";
import { FC, State } from "../dom/fc.js";
import { input, span } from "../dom/html.js";

const Mode = { VIEW: 0, EDIT: 1 };

export interface InlineEditState {
  mode: number;
  value: string;
}

export const InlineEdit = FC<
  {
    mode?: number;
    value: string;
    events: {
      change: (value: string) => void;
    };
  },
  InlineEditState
>("inline-edit", (el, { mode = Mode.VIEW, value, events }) => {
  const state = (el[State] ??= { mode, value });

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
      state.value ?? ""
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
          blur: ({ target }) =>
            events.change((target as HTMLInputElement)?.value ?? ""),
        },
        type: "text",
        value: state.value,
      }),
      "\u00a0" // Hack to get the span to take up space
    );
    setTimeout(() => {
      edit.dispatchEvent(new Event("focus"));
    });
    return edit;
  };

  return render();
});

export default InlineEdit;
