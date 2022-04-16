export const Sizes = {
  none: "0px",
  sm: "0.125rem",
  "": "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
};

export const Sides = {
  "": "",
  t: "Top",
  r: "Right",
  l: "Left",
  b: "Bottom",
  tl: "TopLeft",
  tr: "TopRight",
  bl: "BottomLeft",
  br: "BottomRight",
};

export const Widths = {
  "1/4": "25%",
  "1/2": "50%",
  "3/4": "75%",
  full: "100%",
};

export type Size = keyof typeof Sizes;
export type Side = keyof typeof Sides;
export type Width = keyof typeof Widths;
