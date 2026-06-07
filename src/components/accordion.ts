// Accordion emits the jiffies-css disclosure widget: details > summary + body.
// Why: jiffies-css targets details > summary; the summary must be the first child
// and the disclosed body follows it.

import type { DenormChildren } from "../dom/dom";
import { details, summary } from "../dom/html";
import { toChildren } from "./children";

// Invariant: <summary> is always the first child; remaining children form the body.
export function Accordion(
  summaryContent: DenormChildren | DenormChildren[],
  ...bodyChildren: DenormChildren[]
): HTMLDetailsElement {
  return details(summary(...toChildren(summaryContent)), ...bodyChildren);
}
