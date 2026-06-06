import type { DenormChildren } from "../dom.ts";
import { fieldset, legend as legendTag } from "../html.ts";

// FormGroup emits fieldset[role=group] > legend + children — the jiffies-css
// grouped-controls pattern. This is the structural form group; the richer form
// controls (Input, Select, Radios, ...) live in src/dom/form/form.ts.
// Why: jiffies-css targets fieldset[role=group] to lay grouped controls out as a
// row; role is set with setAttribute since "group" is outside the typed role surface.
// Invariant: <legend> is the first child; role="group"; emits no class attribute.
export function FormGroup(
  legend: DenormChildren,
  ...children: DenormChildren[]
): HTMLFieldSetElement {
  const group = fieldset(legendTag(legend), ...children);
  group.setAttribute("role", "group");
  return group;
}
