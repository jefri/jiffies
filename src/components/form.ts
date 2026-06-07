import type { DenormChildren } from "../dom/dom.ts";
import { fieldset, legend } from "../dom/html.ts";

// FormGroup emits fieldset[role=group] > legend + children — the jiffies-css
// grouped-controls pattern. This is the structural form group; the richer form
// controls (Input, Select, Radios, ...) live in src/dom/form/form.ts.
// Why: jiffies-css targets fieldset[role=group] to lay grouped controls out as a
// row; role is set with setAttribute since "group" is outside the typed role surface.

// Invariant: <legend> is the first child; role="group"; emits no class attribute.
export function FormGroup(
  legendLabel: DenormChildren,
  ...children: DenormChildren[]
): HTMLFieldSetElement {
  const group = fieldset(legend(legendLabel), ...children);
  group.setAttribute("role", "group");
  return group;
}
