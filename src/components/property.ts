import type { Attrs, DenormChildren } from "../dom/dom.ts";
import { dd, dl, dt } from "../dom/html.ts";
import { toChildren } from "./children.ts";

export interface PropertyEntry {
  label: string;
  value: DenormChildren | DenormChildren[];
}

// PropertySheet props: the entry list plus any DOM attrs (class, lang, ...) to
// apply to the outermost <dl>.
export type PropertySheetProps = {
  entries: PropertyEntry[];
} & Attrs<HTMLDListElement>;

// PropertySheet emits dl > (dt + dd)* — the jiffies-css property-sheet pattern,
// one dt/dd pair per entry.
// Why: jiffies-css targets dl > dt + dd for aligned label/value rows; a table or
// div grid is unstyled.
// Invariant: exactly one <dt> (the label) and one <dd> (the value) per entry, in
// entry order; emits no class attribute.
export function PropertySheet({
  entries,
  ...attrs
}: PropertySheetProps): HTMLDListElement {
  const rows: DenormChildren[] = [];
  for (const entry of entries) {
    rows.push(dt(entry.label), dd(...toChildren(entry.value)));
  }
  return dl(attrs, ...rows);
}
