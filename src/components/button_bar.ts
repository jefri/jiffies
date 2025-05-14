import { display } from "../display.ts";
import { FC } from "../dom/fc.ts";
import { fieldset, input, label } from "../dom/html.ts";

let buttonBarId = 1;
const nextId = () => buttonBarId++;

const ButtonBar = FC<{
  // T extends Display
  // @ts-ignore TODO(TFC)
  value: T;
  // @ts-ignore TODO(TFC)
  values: T[];
  // @ts-ignore TODO(TFC)
  events: { onSelect: (current: T) => void };
}>("button-bar", (el, { value, values, events }) => {
  const name = `button-bar-${nextId()}`;
  return fieldset(
    { class: "input-group" },
    ...values.flatMap((option) => {
      const opt = `${option}`.replace(/\s+/g, "_").toLowerCase();
      const id = `${name}-${opt}`;
      return [
        label(
          { role: "button", htmlFor: id },
          input({
            type: "radio",
            id,
            name,
            value: option,
            checked: option === value,
            events: {
              change: () => events.onSelect(option),
            },
          }),
          display(option),
        ),
      ];
    }),
  );
});
export default ButtonBar;
