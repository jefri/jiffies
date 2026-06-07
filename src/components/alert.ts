import type { Attrs, DenormChildren } from "../dom/dom.ts";
import { aside, small } from "../dom/html.ts";

export type AlertVariant = "warning" | "error" | "info" | "success" | "neutral";

// Alert/Chip props: the variant plus any DOM attrs (class, lang, style, ...) to
// apply to the outermost element. The variant is consumed; the rest fall through.
export type AlertProps = { variant: AlertVariant } & Attrs<HTMLElement>;

// The variant vocabulary is this module's single source of truth; this map both
// drives Alert's role derivation and stays exhaustive (a new variant without a
// role entry is a type error).
const ALERT_ROLE: Record<AlertVariant, "alert" | "status"> = {
  warning: "alert",
  error: "alert",
  info: "status",
  success: "status",
  neutral: "status",
};

// Alert emits aside[role][data-variant] for banner-level messaging.
// Why: jiffies-css styles alerts by role + data-variant, not by class. role and
// data-variant are not in the typed attrs surface (role is constrained, data-* is
// not a property), so they are set with setAttribute.
// Invariant: warning|error => role="alert"; info|success|neutral => role="status";
// data-variant always equals the variant; emits no class attribute.
export function Alert(
  { variant, ...attrs }: AlertProps,
  ...children: DenormChildren[]
): HTMLElement {
  const el = aside(attrs, ...children);
  el.setAttribute("role", ALERT_ROLE[variant]);
  el.setAttribute("data-variant", variant);
  return el;
}

// Chip emits small[data-variant] for inline status pills. Same variant vocabulary
// as Alert, no role. Not exercised by the feature test.
export function Chip(
  { variant, ...attrs }: AlertProps,
  ...children: DenormChildren[]
): HTMLElement {
  const el = small(attrs, ...children);
  el.setAttribute("data-variant", variant);
  return el;
}
