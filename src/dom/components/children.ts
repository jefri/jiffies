import type { DenormChildren } from "../dom.ts";

// Normalize a "one child or many" part-slot to a flat children array. Several
// components accept either a single child or an array in the same position
// (CardParts.header/footer, Accordion summary, PropertyEntry.value); this is the
// one place that distinction is collapsed.
export function toChildren(
  part: DenormChildren | DenormChildren[],
): DenormChildren[] {
  return Array.isArray(part) ? part : [part];
}
