import { DenormAttrs, DenormChildren, up, Updatable, Updater } from "./dom.js";
import { Properties } from "./types/css.js";

export type UHTMLElement<E extends HTMLElement = HTMLElement> = Updatable<
  Omit<E, "style">
> & { style: Properties };

const makeHTMLElement =
  <K extends keyof HTMLElementTagNameMap>(name: K) =>
  (
    attrs?: DenormAttrs<Omit<HTMLElementTagNameMap[K], "style">>,
    ...children: DenormChildren[]
  ) =>
    up(document.createElement(name), attrs, ...children) as UHTMLElement<
      HTMLElementTagNameMap[K]
    >;

export const a = makeHTMLElement("a");
export const abbr = makeHTMLElement("abbr");
export const address = makeHTMLElement("address");
export const area = makeHTMLElement("area");
export const article = makeHTMLElement("article");
export const aside = makeHTMLElement("aside");
export const audio = makeHTMLElement("audio");
export const b = makeHTMLElement("b");
export const base = makeHTMLElement("base");
export const bdi = makeHTMLElement("bdi");
export const bdo = makeHTMLElement("bdo");
export const blockquote = makeHTMLElement("blockquote");
export const body = makeHTMLElement("body");
export const br = makeHTMLElement("br");
export const button = makeHTMLElement("button");
export const canvas = makeHTMLElement("canvas");
export const caption = makeHTMLElement("caption");
export const cite = makeHTMLElement("cite");
export const code = makeHTMLElement("code");
export const col = makeHTMLElement("col");
export const colgroup = makeHTMLElement("colgroup");
export const data = makeHTMLElement("data");
export const datalist = makeHTMLElement("datalist");
export const dd = makeHTMLElement("dd");
export const del = makeHTMLElement("del");
export const details = makeHTMLElement("details");
export const dfn = makeHTMLElement("dfn");
export const dialog = makeHTMLElement("dialog");
export const div = makeHTMLElement("div");
export const dl = makeHTMLElement("dl");
export const dt = makeHTMLElement("dt");
export const em = makeHTMLElement("em");
export const embed = makeHTMLElement("embed");
export const fieldset = makeHTMLElement("fieldset");
export const figcaption = makeHTMLElement("figcaption");
export const figure = makeHTMLElement("figure");
export const footer = makeHTMLElement("footer");
export const form = makeHTMLElement("form");
export const h1 = makeHTMLElement("h1");
export const h2 = makeHTMLElement("h2");
export const h3 = makeHTMLElement("h3");
export const h4 = makeHTMLElement("h4");
export const h5 = makeHTMLElement("h5");
export const h6 = makeHTMLElement("h6");
export const head = makeHTMLElement("head");
export const header = makeHTMLElement("header");
export const hgroup = makeHTMLElement("hgroup");
export const hr = makeHTMLElement("hr");
export const html = makeHTMLElement("html");
export const i = makeHTMLElement("i");
export const iframe = makeHTMLElement("iframe");
export const img = makeHTMLElement("img");
export const input = makeHTMLElement("input");
export const ins = makeHTMLElement("ins");
export const kbd = makeHTMLElement("kbd");
export const label = makeHTMLElement("label");
export const legend = makeHTMLElement("legend");
export const li = makeHTMLElement("li");
export const link = makeHTMLElement("link");
export const main = makeHTMLElement("main");
export const map = makeHTMLElement("map");
export const mark = makeHTMLElement("mark");
export const menu = makeHTMLElement("menu");
export const meta = makeHTMLElement("meta");
export const meter = makeHTMLElement("meter");
export const nav = makeHTMLElement("nav");
export const noscript = makeHTMLElement("noscript");
export const object = makeHTMLElement("object");
export const ol = makeHTMLElement("ol");
export const optgroup = makeHTMLElement("optgroup");
export const option = makeHTMLElement("option");
export const output = makeHTMLElement("output");
export const p = makeHTMLElement("p");
export const param = makeHTMLElement("param");
export const picture = makeHTMLElement("picture");
export const pre = makeHTMLElement("pre");
export const progress = makeHTMLElement("progress");
export const q = makeHTMLElement("q");
export const rp = makeHTMLElement("rp");
export const rt = makeHTMLElement("rt");
export const ruby = makeHTMLElement("ruby");
export const s = makeHTMLElement("s");
export const samp = makeHTMLElement("samp");
export const script = makeHTMLElement("script");
export const section = makeHTMLElement("section");
export const select = makeHTMLElement("select");
export const slot = makeHTMLElement("slot");
export const small = makeHTMLElement("small");
export const source = makeHTMLElement("source");
export const span = makeHTMLElement("span");
export const strong = makeHTMLElement("strong");
export const style = makeHTMLElement("style");
export const sub = makeHTMLElement("sub");
export const summary = makeHTMLElement("summary");
export const sup = makeHTMLElement("sup");
export const table = makeHTMLElement("table");
export const tbody = makeHTMLElement("tbody");
export const td = makeHTMLElement("td");
export const template = makeHTMLElement("template");
export const textarea = makeHTMLElement("textarea");
export const tfoot = makeHTMLElement("tfoot");
export const th = makeHTMLElement("th");
export const thead = makeHTMLElement("thead");
export const time = makeHTMLElement("time");
export const title = makeHTMLElement("title");
export const tr = makeHTMLElement("tr");
export const track = makeHTMLElement("track");
export const u = makeHTMLElement("u");
export const ul = makeHTMLElement("ul");
export const htmlvar = makeHTMLElement("var"); // var is reserved, export as variable
export const video = makeHTMLElement("video");
export const wbr = makeHTMLElement("wbr");
