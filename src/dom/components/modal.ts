import type { DenormChildren } from "../dom.ts";
import { dialog } from "../html.ts";

// Modal emits a <dialog>. The element already carries .update() (attached by up()),
// so callers toggle visibility later with modal.update({ open: true }) /
// modal.update({ open: false }) — no separate open helper is warranted.
// Invariant: returns a <dialog> whose children are the supplied content.
export function Modal(...children: DenormChildren[]): HTMLDialogElement {
  return dialog(...children);
}
