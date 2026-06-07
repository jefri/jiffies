// Accordion emits the jiffies-css disclosure widget: details > summary + body.
// Why: jiffies-css targets details > summary; the summary must be the first child
// and the disclosed body follows it.

import type { Attrs, DenormChildren } from "../dom/dom.ts";
import { details, summary } from "../dom/html.ts";
import { toChildren } from "./children.ts";

// Accordion props: the summary slot plus any DOM attrs (class, lang, ...) to apply
// to the outermost <details>.
export type AccordionProps = {
  summary: DenormChildren | DenormChildren[];
} & Attrs<HTMLDetailsElement>;

// Invariant: <summary> is always the first child; remaining children form the body.
export function Accordion(
  { summary: summaryContent, ...attrs }: AccordionProps,
  ...bodyChildren: DenormChildren[]
): HTMLDetailsElement {
  return details(
    attrs,
    summary(...toChildren(summaryContent)),
    ...bodyChildren,
  );
}
