import type { Attrs, DenormChildren } from "../dom.ts";
import {
  button,
  fieldset,
  form,
  input,
  label,
  legend,
  option,
  select,
} from "../html.ts";
import type {
  FormAttributes,
  InputAttributes,
  LabelAttributes,
  OptionAttributes,
  SelectAttributes,
} from "../types/html";

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
  attrs: { options: string[] | object; selected?: string } & SelectAttributes &
    LabelAttributes,
) =>
  label(
    { style: attrs.style ?? {} },
    select(
      { events: attrs.events ?? {} },
      ...prepareOptions(attrs.options as string[], attrs.selected).map(Option),
    ),
  );
// Sanctioned jiffies-css button variants. The default button needs no class.
export type ButtonVariant = "secondary" | "contrast" | "outline";

// Button emits button[type=button] so it never accidentally submits a form. The
// optional variant maps to the matching sanctioned jiffies-css class.
export const Button = (
  variant?: ButtonVariant,
  ...children: DenormChildren[]
) =>
  button(
    variant ? { type: "button", class: variant } : { type: "button" },
    ...children,
  );

const prepareOptions = (
  attrs:
    | string[]
    | Record<
        string,
        string | { label: string; disabled?: boolean; selected?: boolean }
      >,
  selected?: string,
): Parameters<typeof Option>[0][] =>
  Array.isArray(attrs)
    ? attrs.map((value) => ({
        value,
        label: value,
        selected: selected === value,
      }))
    : Object.entries(attrs).map(([value, label]) =>
        typeof label === "string"
          ? { value, label, selected: selected === value }
          : { value, ...label },
      );
export const Option = (attrs: OptionAttributes) =>
  option(attrs as Attrs<HTMLOptionElement>);

export const Dropdown = (
  attrs: SelectAttributes | { selected?: string },
  ...options: Parameters<typeof prepareOptions>[0][]
) =>
  Select({
    ...attrs,
    options: typeof options[0] === "string" ? options : options[0],
  });
// A {value: label} map: option value (also the id/name stem) to display text.
export type ChoiceOptions = Record<string, string>;

// Derive a stable name/id stem from the legend text.
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Shared builder for Radios/Checks/Switches: fieldset[role=group] > legend +
// (input[type] + label[for])* — the jiffies-css grouped-controls structure. The
// shared name groups the inputs; id/for pairs each input to its label.
const choiceGroup = (
  type: "radio" | "checkbox",
  legendText: string,
  options: ChoiceOptions,
  role?: "switch",
): HTMLFieldSetElement => {
  const name = slug(legendText);
  const children: DenormChildren[] = [legend(legendText)];
  for (const [value, labelText] of Object.entries(options)) {
    const id = `${name}-${value}`;
    const box = input({ type, name, id, value });
    if (role) {
      box.setAttribute("role", role);
    }
    const lbl = label(labelText);
    lbl.setAttribute("for", id);
    children.push(box, lbl);
  }
  const group = fieldset(...children);
  group.setAttribute("role", "group");
  return group;
};

export const Radios = (legendText: string, options: ChoiceOptions) =>
  choiceGroup("radio", legendText, options);
export const Checks = (legendText: string, options: ChoiceOptions) =>
  choiceGroup("checkbox", legendText, options);
export const Switches = (legendText: string, options: ChoiceOptions) =>
  choiceGroup("checkbox", legendText, options, "switch");

// Single-item controls wrap the input in its label (label > input + text), the
// jiffies-css labelled-control pattern. type and role are fixed per variant.
export const Radio = (
  labelText: string,
  attrs: Omit<InputAttributes, "type"> = {},
) => Input({ ...attrs, type: "radio" }, labelText);
export const Checkbox = (
  labelText: string,
  attrs: Omit<InputAttributes, "type"> = {},
) => Input({ ...attrs, type: "checkbox" }, labelText);
export const Switch = (
  labelText: string,
  attrs: Omit<InputAttributes, "type" | "role"> = {},
) => Input({ ...attrs, type: "checkbox", role: "switch" }, labelText);
