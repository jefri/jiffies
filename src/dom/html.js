import { up } from "./dom.js";

/** @template {keyof HTMLElementTagNameMap} K */
const makeElement =
  (/** @type K */ name) =>
  /** @returns {import("./dom.js").Updatable<HTMLElementTagNameMap[K]>} */
  (
    /** @type {import ("./dom").DenormAttrs}= */ attrs,

    /** @type Array<Node|string> */ ...children
  ) =>
    up(document.createElement(name), attrs, ...children);

export const a = makeElement("a");
export const abbr = makeElement("abbr");
export const address = makeElement("address");
export const area = makeElement("area");
export const article = makeElement("article");
export const aside = makeElement("aside");
export const audio = makeElement("audio");
export const b = makeElement("b");
export const base = makeElement("base");
export const bdi = makeElement("bdi");
export const bdo = makeElement("bdo");
export const blockquote = makeElement("blockquote");
export const body = makeElement("body");
export const br = makeElement("br");
export const button = makeElement("button");
export const canvas = makeElement("canvas");
export const caption = makeElement("caption");
export const cite = makeElement("cite");
export const code = makeElement("code");
export const col = makeElement("col");
export const colgroup = makeElement("colgroup");
export const data = makeElement("data");
export const datalist = makeElement("datalist");
export const dd = makeElement("dd");
export const del = makeElement("del");
export const details = makeElement("details");
export const dfn = makeElement("dfn");
export const dialog = makeElement("dialog");
export const dir = makeElement("dir");
export const div = makeElement("div");
export const dl = makeElement("dl");
export const dt = makeElement("dt");
export const em = makeElement("em");
export const embed = makeElement("embed");
export const fieldset = makeElement("fieldset");
export const figcaption = makeElement("figcaption");
export const figure = makeElement("figure");
export const font = makeElement("font");
export const footer = makeElement("footer");
export const form = makeElement("form");
export const frame = makeElement("frame");
export const frameset = makeElement("frameset");
export const h1 = makeElement("h1");
export const h2 = makeElement("h2");
export const h3 = makeElement("h3");
export const h4 = makeElement("h4");
export const h5 = makeElement("h5");
export const h6 = makeElement("h6");
export const head = makeElement("head");
export const header = makeElement("header");
export const hgroup = makeElement("hgroup");
export const hr = makeElement("hr");
export const html = makeElement("html");
export const i = makeElement("i");
export const iframe = makeElement("iframe");
export const img = makeElement("img");
export const input = makeElement("input");
export const ins = makeElement("ins");
export const kbd = makeElement("kbd");
export const label = makeElement("label");
export const legend = makeElement("legend");
export const li = makeElement("li");
export const link = makeElement("link");
export const main = makeElement("main");
export const map = makeElement("map");
export const mark = makeElement("mark");
export const marquee = makeElement("marquee");
export const menu = makeElement("menu");
export const meta = makeElement("meta");
export const meter = makeElement("meter");
export const nav = makeElement("nav");
export const noscript = makeElement("noscript");
export const object = makeElement("object");
export const ol = makeElement("ol");
export const optgroup = makeElement("optgroup");
export const option = makeElement("option");
export const output = makeElement("output");
export const p = makeElement("p");
export const param = makeElement("param");
export const picture = makeElement("picture");
export const pre = makeElement("pre");
export const progress = makeElement("progress");
export const q = makeElement("q");
export const rp = makeElement("rp");
export const rt = makeElement("rt");
export const ruby = makeElement("ruby");
export const s = makeElement("s");
export const samp = makeElement("samp");
export const script = makeElement("script");
export const section = makeElement("section");
export const select = makeElement("select");
export const slot = makeElement("slot");
export const small = makeElement("small");
export const source = makeElement("source");
export const span = makeElement("span");
export const strong = makeElement("strong");
export const style = makeElement("style");
export const sub = makeElement("sub");
export const summary = makeElement("summary");
export const sup = makeElement("sup");
export const table = makeElement("table");
export const tbody = makeElement("tbody");
export const td = makeElement("td");
export const template = makeElement("template");
export const textarea = makeElement("textarea");
export const tfoot = makeElement("tfoot");
export const th = makeElement("th");
export const thead = makeElement("thead");
export const time = makeElement("time");
export const title = makeElement("title");
export const tr = makeElement("tr");
export const track = makeElement("track");
export const u = makeElement("u");
export const ul = makeElement("ul");
export const htmlvar = makeElement("var"); // var is reserved, export as variable
export const video = makeElement("video");
export const wbr = makeElement("wbr");
