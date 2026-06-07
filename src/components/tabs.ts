import type { Attrs, DenormChildren } from "../dom/dom.ts";
import { button, div, input, label } from "../dom/html.ts";

// Shared tablist container: div[role=tablist] holding the supplied tab controls.
// Both tab variants emit the same container; this is the one place the role string
// lives (matching the cardLike/navList helpers elsewhere in the module).
function tablist(
  attrs: Attrs<HTMLDivElement>,
  ...children: DenormChildren[]
): HTMLElement {
  const list = div(attrs, ...children);
  list.setAttribute("role", "tablist");
  return list;
}

export interface TabItem {
  label: string;
  selected?: boolean;
  onSelect?: (e: Event) => void; // JS variant only
}

export interface StaticTabItem {
  id: string;
  label: string;
  selected?: boolean;
}

// TabList props: the tab list plus any DOM attrs (class, lang, ...) to apply to
// the outermost div[role=tablist].
export type TabListProps = { tabs: TabItem[] } & Attrs<HTMLDivElement>;

// StaticTabList props: the shared radio-group name and tab list, plus any DOM
// attrs to apply to the outermost div[role=tablist].
export type StaticTabListProps = {
  name: string;
  tabs: StaticTabItem[];
} & Attrs<HTMLDivElement>;

// TabList emits the JS-driven tab strip: div[role=tablist] > button[role=tab].
// Why: jiffies-css targets [role=tablist] > button[role=tab][aria-selected]; the
// caller owns which tab is active and re-renders via .update() on the element.
// Invariant: role="tablist" on the container; every tab is a button[role=tab];
// selected:true sets aria-selected="true"; onSelect is wired as a click handler.
export function TabList({ tabs, ...attrs }: TabListProps): HTMLElement {
  const buttons = tabs.map((tab) => {
    const btn = button(
      tab.onSelect
        ? { type: "button", events: { click: tab.onSelect } }
        : { type: "button" },
      tab.label,
    );
    btn.setAttribute("role", "tab");
    if (tab.selected) {
      btn.setAttribute("aria-selected", "true");
    }
    return btn;
  });
  return tablist(attrs, ...buttons);
}

// StaticTabList emits the CSS-only tab strip: div[role=tablist] >
// (input[type=radio][name][id] + label[role=tab][for])*. The shared name groups
// the radios; :checked drives the active panel with zero JavaScript.
// Invariant: role="tablist" on the container; one radio + one label[role=tab] per
// tab; id/for pair come from StaticTabItem.id; selected:true sets defaultChecked.
export function StaticTabList({
  name,
  tabs,
  ...attrs
}: StaticTabListProps): HTMLElement {
  const children = tabs.flatMap((tab) => {
    const radio = input({ type: "radio", name, id: tab.id });
    if (tab.selected) {
      radio.defaultChecked = true;
    }
    const lbl = label(tab.label);
    lbl.setAttribute("for", tab.id);
    lbl.setAttribute("role", "tab");
    return [radio, lbl];
  });
  return tablist(attrs, ...children);
}
