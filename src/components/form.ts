import type { Attrs, DenormChildren } from "../dom/dom.ts";
import { fieldset, legend } from "../dom/html.ts";

// FormGroup props: the legend label plus any DOM attrs (class, lang, ...) to apply
// to the outermost <fieldset>.
export type FormGroupProps = {
  legend: DenormChildren;
} & Attrs<HTMLFieldSetElement>;

// FormGroup emits fieldset[role=group] > legend + children — the jiffies-css
// grouped-controls pattern. This is the structural form group; the richer form
// controls (Input, Select, Radios, ...) live in src/dom/form/form.ts.
// Why: jiffies-css targets fieldset[role=group] to lay grouped controls out as a
// row; role is set with setAttribute since "group" is outside the typed role surface.

// Invariant: <legend> is the first child; role="group"; emits no class attribute.
export function FormGroup(
  { legend: legendLabel, ...attrs }: FormGroupProps,
  ...children: DenormChildren[]
): HTMLFieldSetElement {
  const group = fieldset(attrs, legend(legendLabel), ...children);
  group.setAttribute("role", "group");
  return group;
}
