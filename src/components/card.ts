import type { DenormChildren } from "../dom/dom.ts";
import { article, footer, header, main, section } from "../dom/html.ts";
import { toChildren } from "./children.ts";

export interface CardParts {
  header?: DenormChildren | DenormChildren[];
  footer?: DenormChildren | DenormChildren[];
}

// Build the shared header? / main / footer? sequence. `root` is the wrapper
// element builder (article for Card, section for Panel); the only difference
// between the two components is which wrapper they use.
function cardLike(
  root: typeof article,
  parts: CardParts,
  children: DenormChildren[],
): HTMLElement {
  const sections: DenormChildren[] = [];
  if (parts.header !== undefined) {
    sections.push(header(...toChildren(parts.header)));
  }
  sections.push(main(...children));
  if (parts.footer !== undefined) {
    sections.push(footer(...toChildren(parts.footer)));
  }
  return root(...sections);
}

// Card emits the jiffies-css elevated-card structure: article > header? / main / footer?.
// Why: jiffies-css targets `article > main` for card body padding, so body content
// must always be wrapped in <main>, never placed as a bare article child.
// Invariants: <main> is always emitted (even with no parts); <header> only when
// parts.header is set; <footer> only when parts.footer is set; child order is
// always header, main, footer; emits no class attribute.
export function Card(
  parts: CardParts,
  ...children: DenormChildren[]
): HTMLElement {
  return cardLike(article, parts, children);
}

// Panel is the flat variant: section > header? / main / footer?. Same contract as
// Card with `section` in place of `article`. Not exercised by the feature test.
export function Panel(
  parts: CardParts,
  ...children: DenormChildren[]
): HTMLElement {
  return cardLike(section, parts, children);
}
