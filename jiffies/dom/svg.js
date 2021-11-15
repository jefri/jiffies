import { up } from "./dom.ts";

/** @template {keyof SVGElementTagNameMap} K */
const makeSVGElement =
  (/** @type K */ name) =>
  /** @returns {SVGElementTagNameMap[K]} */
  (
    /** @type {import ("./dom").DenormAttrs<SVGElementTagNameMap[K]>}= */ attrs,
    /** @type {import("./dom.js").DenormChildrenList} */ ...children
  ) =>
    up(
      document.createElementNS("http://www.w3.org/2000/svg", name),
      attrs,
      ...children
    );

export const a = makeSVGElement("a");
export const animate = makeSVGElement("animate");
export const animateMotion = makeSVGElement("animateMotion");
export const animateTransform = makeSVGElement("animateTransform");
export const circle = makeSVGElement("circle");
export const clipPath = makeSVGElement("clipPath");
export const defs = makeSVGElement("defs");
export const desc = makeSVGElement("desc");
export const ellipse = makeSVGElement("ellipse");
export const feBlend = makeSVGElement("feBlend");
export const feColorMatrix = makeSVGElement("feColorMatrix");
export const feComponentTransfer = makeSVGElement("feComponentTransfer");
export const feComposite = makeSVGElement("feComposite");
export const feConvolveMatrix = makeSVGElement("feConvolveMatrix");
export const feDiffuseLighting = makeSVGElement("feDiffuseLighting");
export const feDisplacementMap = makeSVGElement("feDisplacementMap");
export const feDistantLight = makeSVGElement("feDistantLight");
export const feDropShadow = makeSVGElement("feDropShadow");
export const feFlood = makeSVGElement("feFlood");
export const feFuncA = makeSVGElement("feFuncA");
export const feFuncB = makeSVGElement("feFuncB");
export const feFuncG = makeSVGElement("feFuncG");
export const feFuncR = makeSVGElement("feFuncR");
export const feGaussianBlur = makeSVGElement("feGaussianBlur");
export const feImage = makeSVGElement("feImage");
export const feMerge = makeSVGElement("feMerge");
export const feMergeNode = makeSVGElement("feMergeNode");
export const feMorphology = makeSVGElement("feMorphology");
export const feOffset = makeSVGElement("feOffset");
export const fePointLight = makeSVGElement("fePointLight");
export const feSpecularLighting = makeSVGElement("feSpecularLighting");
export const feSpotLight = makeSVGElement("feSpotLight");
export const feTile = makeSVGElement("feTile");
export const feTurbulence = makeSVGElement("feTurbulence");
export const filter = makeSVGElement("filter");
export const foreignObject = makeSVGElement("foreignObject");
export const g = makeSVGElement("g");
export const image = makeSVGElement("image");
export const line = makeSVGElement("line");
export const linearGradient = makeSVGElement("linearGradient");
export const marker = makeSVGElement("marker");
export const mask = makeSVGElement("mask");
export const metadata = makeSVGElement("metadata");
export const mpath = makeSVGElement("mpath");
export const path = makeSVGElement("path");
export const pattern = makeSVGElement("pattern");
export const polygon = makeSVGElement("polygon");
export const polyline = makeSVGElement("polyline");
export const radialGradient = makeSVGElement("radialGradient");
export const rect = makeSVGElement("rect");
export const script = makeSVGElement("script");
export const set = makeSVGElement("set");
export const stop = makeSVGElement("stop");
export const style = makeSVGElement("style");
export const svg = makeSVGElement("svg");
export const svgswitch = makeSVGElement("switch");
export const symbol = makeSVGElement("symbol");
export const text = makeSVGElement("text");
export const textPath = makeSVGElement("textPath");
export const title = makeSVGElement("title");
export const tspan = makeSVGElement("tspan");
export const use = makeSVGElement("use");
export const view = makeSVGElement("view");
