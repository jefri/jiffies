import { FC } from "../dom/fc.js";
import { input, span } from "../dom/html.js";

const Mode = {
  VIEW: 0,
  EDIT: 1,
};

/**
 * @param {{
    value: string;
    events: {
      change: (value: string) => void;
    }
  }} props
 */
export const InlineEdit = FC("inline-edit", (props) => {
  const state = {
    mode: Mode.VIEW,
  };

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
          click: () => setState({ mode: Mode.EDIT }),
        },
      },
      props.value
    );

  const edit = () =>
    input({
      style: { zIndex: "z-10" },
      events: {
        blur: ({ target: { value } }) => update(value),
      },
      type: "text",
      defaultValue: props.value,
    });

  function update(/** @type string */ value) {
    props.events.change(value);
    state.mode = Mode.VIEW;
    element.update(render());
  }

  const element = span(render());
  return element;
});

export default InlineEdit;
