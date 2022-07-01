import { Attrs, DenormChildren } from "../dom"
import { form, input, label, option, select } from "../html"
import {
  FormAttributes,
  InputAttributes,
  LabelAttributes,
  OptionAttributes,
  SelectAttributes,
} from "../types/html"

export const Form = (attrs: FormAttributes, ...children: DenormChildren[]) => {
  if (attrs.events?.submit) {
    const submit = attrs.events.submit;
    attrs.events.submit = (event) => {
      event.preventDefault();
      submit(event);
    };
  }
  return form(attrs as Attrs<HTMLFormElement>, ...children);
};
export const Input = (attrs: InputAttributes, ...children: DenormChildren[]) =>
  label(input(attrs as Attrs<HTMLInputElement>), ...children);

export const Select = (
  attrs: { options: string[] | {}; selected?: string } & SelectAttributes &
    LabelAttributes
) =>
  label(
    { style: attrs.style ?? {} },
    select(
      { events: attrs.events ?? {} },
      ...prepareOptions(attrs.options, attrs.selected).map(Option)
    )
  );
export const Button = () => {};

const prepareOptions = (
  attrs:
    | string[]
    | Record<
        string,
        string | { label: string; disabled?: boolean; selected?: boolean }
      >,
  selected?: string
): Parameters<typeof Option>[0][] =>
  Array.isArray(attrs)
    ? attrs.map((value) => ({
        value,
        label: value,
        selected: selected == value,
      }))
    : Object.entries(attrs).map(([value, label]) =>
        typeof label === "string"
          ? { value, label, selected: selected === value }
          : { value, ...label }
      );
export const Option = (attrs: OptionAttributes) =>
  option(attrs as Attrs<HTMLOptionElement>);

export const Dropdown = (
  attrs: SelectAttributes | { selected?: string },
  ...options: Parameters<typeof prepareOptions>[0][]
) =>
  Select({
    ...attrs,
    options: typeof options[0] == "string" ? options : options[0],
  });
export const Radios = () => {};
export const Checks = () => {};
export const Switches = () => {};

export const Radio = (attrs: Omit<InputAttributes, "type">) =>
  Input({ type: "radio" });
export const Checkbox = (attrs: Omit<InputAttributes, "type">) =>
  Input({ type: "checkbox" });
export const Switch = () => Checkbox({ role: "switch" });
