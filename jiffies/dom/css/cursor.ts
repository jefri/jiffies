export type Cursor =
  // General
  | "auto"
  | "default"
  | "none"
  // Links & status
  | "context-menu"
  | "help"
  | "pointer"
  | "progress"
  | "wait"
  // Selection
  | "cell"
  | "crosshair"
  | "text"
  | "vertical-text"
  // Drag & Drop
  | "alias"
  | "copy"
  | "move"
  | "no-drop"
  | "not-allowed"
  | "grab"
  | "grabbing"
  // Resizing & scrolling
  | "all-scroll"
  | "col-resize"
  | "row-resize"
  | "n-resize"
  | "e-resize"
  | "s-resize"
  | "w-resize"
  | "ne-resize"
  | "nw-resize"
  | "se-resize"
  | "sw-resize"
  | "ew-resize"
  | "ns-resize"
  | "nesw-resize"
  | "nwse-resize"
  // zooming
  | "zoom-in"
  | "zoom-out";

export function cursor<C extends Cursor>(cursor: C): { cursor: C } {
  return { cursor };
}
