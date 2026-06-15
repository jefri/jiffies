import {
  type DenormAttrs,
  type DenormChildren,
  SVG_NAMESPACE_URI,
  up,
} from "./dom.ts";

export type SVGPresentationAttrs = {
  fill?: string;
  "fill-opacity"?: string | number;
  "fill-rule"?: "nonzero" | "evenodd" | "inherit";
  stroke?: string;
  "stroke-dasharray"?: string;
  "stroke-dashoffset"?: string | number;
  "stroke-linecap"?: "butt" | "round" | "square" | "inherit";
  "stroke-linejoin"?: "miter" | "round" | "bevel" | "inherit";
  "stroke-miterlimit"?: string | number;
  "stroke-opacity"?: string | number;
  "stroke-width"?: string | number;
  opacity?: string | number;
  "clip-path"?: string;
  "clip-rule"?: "nonzero" | "evenodd" | "inherit";
  color?: string;
  "color-interpolation"?: "auto" | "sRGB" | "linearRGB" | "inherit";
  "color-rendering"?: "auto" | "optimizeSpeed" | "optimizeQuality" | "inherit";
  cursor?: string;
  display?: string;
  filter?: string;
  "image-rendering"?: "auto" | "optimizeSpeed" | "optimizeQuality" | "inherit";
  marker?: string;
  "marker-end"?: string;
  "marker-mid"?: string;
  "marker-start"?: string;
  mask?: string;
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  "paint-order"?: string;
  "pointer-events"?: string;
  "shape-rendering"?:
    | "auto"
    | "optimizeSpeed"
    | "crispEdges"
    | "geometricPrecision"
    | "inherit";
  "text-rendering"?:
    | "auto"
    | "optimizeSpeed"
    | "optimizeLegibility"
    | "geometricPrecision"
    | "inherit";
  "transform-origin"?: string;
  "vector-effect"?: "none" | "non-scaling-stroke" | "inherit";
  visibility?: "visible" | "hidden" | "collapse" | "inherit";
};

export type SVGTextPresentationAttrs = SVGPresentationAttrs & {
  "font-family"?: string;
  "font-size"?: string | number;
  "font-size-adjust"?: string | number;
  "font-stretch"?: string;
  "font-style"?: "normal" | "italic" | "oblique" | "inherit";
  "font-variant"?: string;
  "font-weight"?: string | number;
  "text-anchor"?: "start" | "middle" | "end" | "inherit";
  "text-decoration"?: string;
  "letter-spacing"?: string | number;
  "word-spacing"?: string | number;
  "dominant-baseline"?: string;
  "alignment-baseline"?: string;
  "baseline-shift"?: string;
  "writing-mode"?: string;
  "unicode-bidi"?: string;
  direction?: "ltr" | "rtl" | "inherit";
};

export type SVGStopAttrs = {
  "stop-color"?: string;
  "stop-opacity"?: string | number;
  offset?: string | number;
};

export type SVGFloodAttrs = {
  "flood-color"?: string;
  "flood-opacity"?: string | number;
};

export type SVGLightingAttrs = {
  "lighting-color"?: string;
};

export type SVGPathExtraAttrs = {
  d?: string;
};

export type SVGAnimationTimingAttrs = {
  attributeName?: string;
  from?: string | number;
  to?: string | number;
  by?: string | number;
  values?: string;
  dur?: string;
  begin?: string;
  end?: string;
  min?: string;
  max?: string;
  repeatCount?: string | number;
  repeatDur?: string;
  restart?: "always" | "whenNotActive" | "never";
  fill?: "freeze" | "remove";
  calcMode?: "discrete" | "linear" | "paced" | "spline";
  keyTimes?: string;
  keySplines?: string;
  keyPoints?: string;
  additive?: "replace" | "sum";
  accumulate?: "none" | "sum";
  type?: string;
  path?: string;
};

export type SVGFilterPrimitiveInAttrs = {
  in?: string;
  in2?: string;
  result?: string;
};

const makeSVGElement =
  <K extends keyof SVGElementTagNameMap, S = object>(name: K) =>
  (
    attrs?: DenormAttrs<SVGElementTagNameMap[K], S>,
    ...children: DenormChildren[]
  ) =>
    up(
      window.document.createElementNS(SVG_NAMESPACE_URI, name),
      attrs as DenormAttrs<SVGElementTagNameMap[K]>,
      ...children,
    ) as SVGElementTagNameMap[K];

export const a = makeSVGElement<"a", SVGPresentationAttrs>("a");
export const animate = makeSVGElement<"animate", SVGAnimationTimingAttrs>(
  "animate",
);
export const animateMotion = makeSVGElement<
  "animateMotion",
  SVGAnimationTimingAttrs
>("animateMotion");
export const animateTransform = makeSVGElement<
  "animateTransform",
  SVGAnimationTimingAttrs
>("animateTransform");
export const circle = makeSVGElement<"circle", SVGPresentationAttrs>("circle");
export const clipPath = makeSVGElement<"clipPath", SVGPresentationAttrs>(
  "clipPath",
);
export const defs = makeSVGElement<"defs", SVGPresentationAttrs>("defs");
export const desc = makeSVGElement("desc");
export const ellipse = makeSVGElement<"ellipse", SVGPresentationAttrs>(
  "ellipse",
);
export const feBlend = makeSVGElement<"feBlend", SVGFilterPrimitiveInAttrs>(
  "feBlend",
);
export const feColorMatrix = makeSVGElement<
  "feColorMatrix",
  SVGFilterPrimitiveInAttrs
>("feColorMatrix");
export const feComponentTransfer = makeSVGElement<
  "feComponentTransfer",
  SVGFilterPrimitiveInAttrs
>("feComponentTransfer");
export const feComposite = makeSVGElement<
  "feComposite",
  SVGFilterPrimitiveInAttrs
>("feComposite");
export const feConvolveMatrix = makeSVGElement<
  "feConvolveMatrix",
  SVGFilterPrimitiveInAttrs
>("feConvolveMatrix");
export const feDiffuseLighting = makeSVGElement<
  "feDiffuseLighting",
  SVGFilterPrimitiveInAttrs & SVGLightingAttrs
>("feDiffuseLighting");
export const feDisplacementMap = makeSVGElement<
  "feDisplacementMap",
  SVGFilterPrimitiveInAttrs
>("feDisplacementMap");
export const feDistantLight = makeSVGElement("feDistantLight");
export const feDropShadow = makeSVGElement<
  "feDropShadow",
  SVGFilterPrimitiveInAttrs & SVGFloodAttrs
>("feDropShadow");
export const feFlood = makeSVGElement<
  "feFlood",
  SVGFloodAttrs & SVGFilterPrimitiveInAttrs
>("feFlood");
export const feFuncA = makeSVGElement("feFuncA");
export const feFuncB = makeSVGElement("feFuncB");
export const feFuncG = makeSVGElement("feFuncG");
export const feFuncR = makeSVGElement("feFuncR");
export const feGaussianBlur = makeSVGElement<
  "feGaussianBlur",
  SVGFilterPrimitiveInAttrs
>("feGaussianBlur");
export const feImage = makeSVGElement<"feImage", SVGFilterPrimitiveInAttrs>(
  "feImage",
);
export const feMerge = makeSVGElement("feMerge");
export const feMergeNode = makeSVGElement("feMergeNode");
export const feMorphology = makeSVGElement<
  "feMorphology",
  SVGFilterPrimitiveInAttrs
>("feMorphology");
export const feOffset = makeSVGElement<"feOffset", SVGFilterPrimitiveInAttrs>(
  "feOffset",
);
export const fePointLight = makeSVGElement("fePointLight");
export const feSpecularLighting = makeSVGElement<
  "feSpecularLighting",
  SVGFilterPrimitiveInAttrs & SVGLightingAttrs
>("feSpecularLighting");
export const feSpotLight = makeSVGElement("feSpotLight");
export const feTile = makeSVGElement<"feTile", SVGFilterPrimitiveInAttrs>(
  "feTile",
);
export const feTurbulence = makeSVGElement<
  "feTurbulence",
  SVGFilterPrimitiveInAttrs
>("feTurbulence");
export const filter = makeSVGElement<"filter", SVGPresentationAttrs>("filter");
export const foreignObject = makeSVGElement<
  "foreignObject",
  SVGPresentationAttrs
>("foreignObject");
export const g = makeSVGElement<"g", SVGPresentationAttrs>("g");
export const image = makeSVGElement<"image", SVGPresentationAttrs>("image");
export const line = makeSVGElement<"line", SVGPresentationAttrs>("line");
export const linearGradient = makeSVGElement<
  "linearGradient",
  SVGPresentationAttrs
>("linearGradient");
export const marker = makeSVGElement<"marker", SVGPresentationAttrs>("marker");
export const mask = makeSVGElement<"mask", SVGPresentationAttrs>("mask");
export const metadata = makeSVGElement("metadata");
export const mpath = makeSVGElement("mpath");
export const path = makeSVGElement<
  "path",
  SVGPresentationAttrs & SVGPathExtraAttrs
>("path");
export const pattern = makeSVGElement<"pattern", SVGPresentationAttrs>(
  "pattern",
);
export const polygon = makeSVGElement<"polygon", SVGPresentationAttrs>(
  "polygon",
);
export const polyline = makeSVGElement<"polyline", SVGPresentationAttrs>(
  "polyline",
);
export const radialGradient = makeSVGElement<
  "radialGradient",
  SVGPresentationAttrs
>("radialGradient");
export const rect = makeSVGElement<"rect", SVGPresentationAttrs>("rect");
export const script = makeSVGElement("script");
export const set = makeSVGElement<"set", SVGAnimationTimingAttrs>("set");
export const stop = makeSVGElement<"stop", SVGStopAttrs>("stop");
export const style = makeSVGElement("style");
export const svg = makeSVGElement<"svg", SVGPresentationAttrs>("svg");
export const svgswitch = makeSVGElement<"switch", SVGPresentationAttrs>(
  "switch",
);
export const symbol = makeSVGElement<"symbol", SVGPresentationAttrs>("symbol");
export const text = makeSVGElement<"text", SVGTextPresentationAttrs>("text");
export const textPath = makeSVGElement<"textPath", SVGTextPresentationAttrs>(
  "textPath",
);
export const title = makeSVGElement("title");
export const tspan = makeSVGElement<"tspan", SVGTextPresentationAttrs>("tspan");
export const use = makeSVGElement<"use", SVGPresentationAttrs>("use");
export const view = makeSVGElement("view");
