import type { DenormAttrs, DenormChildren } from "../dom/dom.ts";
import { dialog } from "../dom/html.ts";

// Modal emits a <dialog>. It has no domain props, so its leading argument is the
// denormalized attrs of any html builder: a plain object is attrs (class, lang,
// ...) applied to the <dialog>, anything else is the first child. The element
// already carries .update() (attached by up()), so callers toggle visibility
// later with modal.update({ open: true }) / modal.update({ open: false }).
// Invariant: returns a <dialog> whose children are the supplied content.
export function Modal(
  attrs?: DenormAttrs<HTMLDialogElement>,
  ...children: DenormChildren[]
): HTMLDialogElement {
  return dialog(attrs, ...children);
}
