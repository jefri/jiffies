import { Properties } from "./css.js";

export interface AriaAttributes {
  [_: `aria-${string}`]: string;
}

export interface Sized {
  height?: number | string;
  width?: number | string;
}

export type MimeTypeString = `${string}/${string}`;

export type ReferrerPolicy =
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "origin"
  | "origin-when-cross-origin"
  | "same-origin"
  | "strict-origin"
  | "strict-origin-when-cross-origin"
  | "unsafe-url";

export interface EventHandler {
  (k: Event): void;
}

export interface GlobalEvents {
  abort: EventHandler;
  autocomplete: EventHandler;
  autocompleteerror: EventHandler;
  blur: EventHandler;
  cancel: EventHandler;
  canplay: EventHandler;
  canplaythrough: EventHandler;
  change: EventHandler;
  click: EventHandler;
  close: EventHandler;
  contextmenu: EventHandler;
  cuechange: EventHandler;
  dblclick: EventHandler;
  drag: EventHandler;
  dragend: EventHandler;
  dragenter: EventHandler;
  dragleave: EventHandler;
  dragover: EventHandler;
  dragstart: EventHandler;
  drop: EventHandler;
  durationchange: EventHandler;
  emptied: EventHandler;
  ended: EventHandler;
  error: EventHandler;
  focus: EventHandler;
  input: EventHandler;
  invalid: EventHandler;
  keydown: EventHandler;
  keypress: EventHandler;
  keyup: EventHandler;
  load: EventHandler;
  loadeddata: EventHandler;
  loadedmetadata: EventHandler;
  loadstart: EventHandler;
  mousedown: EventHandler;
  mouseenter: EventHandler;
  mouseleave: EventHandler;
  mousemove: EventHandler;
  mouseout: EventHandler;
  mouseover: EventHandler;
  mouseup: EventHandler;
  mousewheel: EventHandler;
  pause: EventHandler;
  play: EventHandler;
  playing: EventHandler;
  progress: EventHandler;
  ratechange: EventHandler;
  reset: EventHandler;
  resize: EventHandler;
  scroll: EventHandler;
  seeked: EventHandler;
  seeking: EventHandler;
  select: EventHandler;
  show: EventHandler;
  sort: EventHandler;
  stalled: EventHandler;
  submit: EventHandler;
  suspend: EventHandler;
  timeupdate: EventHandler;
  toggle: EventHandler;
  volumechange: EventHandler;
  waiting: EventHandler;
}

export interface GlobalAttributes extends AriaAttributes {
  accesskey?: string; // Space separated list of characters
  autocapitalize?: "off" | "none" | "on" | "words" | "sentences" | "characters";
  autofocus?: boolean;
  class?: string; // classes applied, separated by spaces
  contenteditable?: boolean;
  contextmenu?: string; // ID
  // [k?: `data-${string}`]: string;
  // readonly dataset?: Record<string, string>;
  dir?: "ltr" | "rtl" | "auto";
  draggable?: boolean;
  enterkeyhint?: string;
  events?: Partial<GlobalEvents>;
  hidden?: boolean;
  id?: string;
  inputmode?: string;
  is?: string;
  itemid?: string;
  itemref?: string;
  itemtype?: string;
  lang?: string; // RFC-5646 / BCP-47
  nonce?: string;
  spellcheck?: boolean;
  // style?: string; // Replaced with fstyle
  style?: Partial<Properties>;
  tabindex?: number;
  title?: string;
  translate?: "" | "yes" | "no";
}

// Content Sectioning
export interface AddressAttributes extends GlobalAttributes {}
export interface ArticleAttributes extends GlobalAttributes {}
export interface AsideAttributes extends GlobalAttributes {}
export interface FooterAttributes extends GlobalAttributes {}
export interface HeaderAttributes extends GlobalAttributes {}
export interface H1Attributes extends GlobalAttributes {}
export interface H2Attributes extends GlobalAttributes {}
export interface H3Attributes extends GlobalAttributes {}
export interface H4Attributes extends GlobalAttributes {}
export interface H5Attributes extends GlobalAttributes {}
export interface H6Attributes extends GlobalAttributes {}
export interface MainAttributes extends GlobalAttributes {}
export interface NavAttributes extends GlobalAttributes {}
export interface SectionAttributes extends GlobalAttributes {}

// Inlint Text
export interface BlockquoteAttributes extends GlobalAttributes {
  cite: string;
}
export interface DdAttributes extends GlobalAttributes {
  nowrap: "no";
}
export interface DivAttributes extends GlobalAttributes {}
export interface DlAttributes extends GlobalAttributes {}
export interface DtAttributes extends GlobalAttributes {}
export interface FigcaptionAttributes extends GlobalAttributes {}
export interface FigureAttributes extends GlobalAttributes {}
export interface HrAttributes extends GlobalAttributes {}
export interface LiAttributes extends GlobalAttributes {
  value: number;
}
export interface MenuAttributes extends GlobalAttributes {}
export interface OlAttributes extends GlobalAttributes {
  reversed: boolean;
  start: number;
  type: "a" | "A" | "i" | "I" | "0";
}
export interface PAttributes extends GlobalAttributes {}
export interface PreAttributes extends GlobalAttributes {}
export interface UlAttributes extends GlobalAttributes {}

// Text Content
export interface AAttributes extends GlobalAttributes {
  alt?: string;
  download?: string;
  href: string;
  hreflang?: string; // See lang
  ping?: string;
  referrerpolicy?: ReferrerPolicy;
  rel?: string;
  target?: "_self" | "_blank" | "_parent" | "_top";
  type?: MimeTypeString; // mime type
}
export interface AbbrAttributes extends GlobalAttributes {}
export interface BAttributes extends GlobalAttributes {}
export interface BdiAttributes extends GlobalAttributes {}
export interface BdoAttributes extends GlobalAttributes {
  dir: "rtl" | "ltr";
}
export interface BrAttributes extends GlobalAttributes {}
export interface CiteAttributes extends GlobalAttributes {}
export interface CodeAttributes extends GlobalAttributes {}
export interface DataAttributes extends GlobalAttributes {}
export interface DfnAttributes extends GlobalAttributes {}
export interface EmAttributes extends GlobalAttributes {}
export interface IAttributes extends GlobalAttributes {}
export interface KbdAttributes extends GlobalAttributes {}
export interface MarkAttributes extends GlobalAttributes {}
export interface QAttributes extends GlobalAttributes {
  cite: string;
}
export interface RpAttributes extends GlobalAttributes {}
export interface RtAttributes extends GlobalAttributes {}
export interface RubyAttributes extends GlobalAttributes {}
export interface SAttributes extends GlobalAttributes {}
export interface SampAttributes extends GlobalAttributes {}
export interface SmallAttributes extends GlobalAttributes {}
export interface SpanAttributes extends GlobalAttributes {}
export interface StrongAttributes extends GlobalAttributes {}
export interface SubAttributes extends GlobalAttributes {}
export interface SupAttributes extends GlobalAttributes {}
export interface TimeAttributes extends GlobalAttributes {
  datetime: string; // Limited date formats
}
export interface UAttributes extends GlobalAttributes {}
export interface VarAttributes extends GlobalAttributes {}
export interface WbrAttributes extends GlobalAttributes {}

// Image and Multimedia
export interface AreaAttributes extends GlobalAttributes, AAttributes {
  coords: string; // Has special format
  shape: "rect" | "circle" | "poly" | "default";
}

export interface AudioAttributes extends GlobalAttributes {
  autoplay?: boolean;
  controls?: boolean;
  crossorigin?: "anonymous" | "use-credentials";
  loop?: boolean;
  muted?: boolean;
  preload?: "none" | "metadata" | "auto";
  src: string;
  events?: Partial<{
    audioprocess: EventHandler;
    canplay: EventHandler;
    canplaythrough: EventHandler;
    complete: EventHandler;
    durationchange: EventHandler;
    emptied: EventHandler;
    ended: EventHandler;
    loadeddata: EventHandler;
    loadedmetadata: EventHandler;
    pause: EventHandler;
    play: EventHandler;
    playing: EventHandler;
    ratechange: EventHandler;
    seeked: EventHandler;
    seeking: EventHandler;
    stalled: EventHandler;
    suspend: EventHandler;
    timeupdate: EventHandler;
    volumechange: EventHandler;
    waiting: EventHandler;
  }>;
}
export interface ImgAttributes extends GlobalAttributes, Sized {
  alt?: string;
  crossorigin?: "anonymous" | "use-credentials";
  decoding?: "sync" | "async" | "auto";
  fetchpriority?: "high" | "low" | "auto";
  ismap?: boolean;
  referrerpolicy?: ReferrerPolicy;
  sizes?: string;
  src: string;
  srcset?: string;
  usemap?: string;
}
export interface MapAttributes extends GlobalAttributes {
  name: string;
}
export interface TrackAttributes extends GlobalAttributes {
  default?: boolean;
  kind: "subtitles" | "captions" | "descriptions" | "chapters" | "metadata";
  label?: string;
  src: string;
  srclang?: string; // BCP-47, required if kind is subtitles
}
export interface VideoAttributes extends GlobalAttributes, Sized {
  autoplay?: boolean;
  controls?: string[];
  crossorigin: "anonymous" | "use-credentials";
  loop?: boolean;
  muted?: boolean;
  playsinline?: boolean;
  poster?: string;
  preload?: "none" | "metadata" | "auto";
  src: string;
  events?: Partial<{
    canplay: EventHandler;
    canplaythrough: EventHandler;
    complete: EventHandler;
    durationchange: EventHandler;
    emptied: EventHandler;
    ended: EventHandler;
    loadeddata: EventHandler;
    loadedmetadata: EventHandler;
    pause: EventHandler;
    play: EventHandler;
    playing: EventHandler;
    progress: EventHandler;
    ratechange: EventHandler;
    seeked: EventHandler;
    seeking: EventHandler;
    stalled: EventHandler;
    suspend: EventHandler;
    timeupdate: EventHandler;
    volumechange: EventHandler;
    waiting: EventHandler;
  }>;
}

// Embedded content
export interface EmbedAttributes extends GlobalAttributes, Sized {}
export interface IframeAttributes extends GlobalAttributes, Sized {}
export interface ObjectAttributes extends GlobalAttributes, Sized {}
export interface ParamAttributes extends GlobalAttributes {
  name: string;
  value: string;
}
export interface PictureAttributes extends GlobalAttributes {}
export interface PortalAttributes extends GlobalAttributes {
  referrerpolicy?: ReferrerPolicy;
  src: string;
}
export interface SourceAttributes extends GlobalAttributes, Sized {
  type: MimeTypeString;
  src: string;
  srcset?: string;
  sizes?: string;
  media?: string;
}

// Table

// Forms
interface FormElementAttributes {
  autofocus?: boolean;
  autocomplete?: boolean;
  disabled?: boolean;
  form?: string;
  name?: string;
  placeholder?: string;
  value?: string | number | boolean;
}

interface FormActionAttributes {
  formAction?: string;
  formEnctype?:
    | "application/x-www-form-urlencoded"
    | "multipart/form-data"
    | "text/plain";
  formMethod?: "get" | "post";
  formNoValidate?: boolean;
  formTarget?: boolean;
}

export interface ButtonAttributes
  extends GlobalAttributes,
    FormElementAttributes,
    FormActionAttributes {}
export interface DatalistAttributes extends GlobalAttributes {}
export interface FieldsetAttributes
  extends GlobalAttributes,
    FormElementAttributes {}
export interface FormAttributes extends GlobalAttributes {
  autocomplete?: boolean;
  name?: string;
  rel?: string;
  action?: string;
  enctype?:
    | "application/x-www-form-urlencoded"
    | "multipart/form-data"
    | "text/plain";
  method?: "get" | "post" | "dialog";
  noValidate?: boolean;
  target?: boolean;
}
export interface InputAttributes
  extends GlobalAttributes,
    FormElementAttributes,
    FormActionAttributes,
    Sized {
  accept?: boolean;
  alt?: string;
  capture?: boolean;
  list?: string;
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
  multiple?: boolean;
  pattern?: string;
  readOnly?: boolean;
  required?: boolean;
  role?: "switch" | "switch-disabled";
  size?: string;
  src?: string;
  step?: number;
  type?:
    | "button"
    | "checkbox"
    | "color"
    | "date"
    | "datetime-local"
    | "email"
    | "file"
    | "hidden"
    | "image"
    | "month"
    | "number"
    | "password"
    | "radio"
    | "range"
    | "reset"
    | "search"
    | "submit"
    | "text"
    | "time"
    | "url"
    | "week";
}
export interface LabelAttributes extends GlobalAttributes {
  for?: string;
}
export interface LegendAttributes extends GlobalAttributes {}
export interface MeterAttributes extends GlobalAttributes {
  value: number;
  min?: number;
  max?: number;
  low?: number;
  high?: number;
  optimum?: number;
}
export interface OptgroupAttributes extends GlobalAttributes {
  disabled?: boolean;
  label: string;
}
export interface OptionAttributes extends GlobalAttributes {
  disabled?: boolean;
  label?: string;
  selected?: boolean;
  value?: string;
}
export interface OutputAttributes extends GlobalAttributes {
  for: string;
  name: string;
  form?: string;
}
export interface ProgressAttributes extends GlobalAttributes {
  max?: number;
  value?: number;
}
export interface SelectAttributes
  extends GlobalAttributes,
    FormElementAttributes {
  multiple?: boolean;
  size?: string;
}
export interface TextareaAttributes
  extends GlobalAttributes,
    FormElementAttributes {
  maxlength?: number;
  minlength?: number;
  rows?: number;
  cols?: number;
  wrap?: boolean;
}

// Table elements
export interface CaptionAttributes extends GlobalAttributes {}
export interface ColAttributes extends GlobalAttributes {
  span?: number;
}
export interface ColgroupAttributes extends GlobalAttributes {
  span?: number;
}
export interface TableAttributes extends GlobalAttributes {}
export interface TbodyAttributes extends GlobalAttributes {}
export interface TdAttributes extends GlobalAttributes {
  colspan?: number;
  headers?: string[];
  rowspan?: number;
}
export interface TfootAttributes extends GlobalAttributes {}
export interface ThAttributes extends GlobalAttributes {
  abbr?: string;
  colspan?: number;
  headers?: string[];
  rowspan?: number;
  scope?: "row" | "col" | "rowgroup" | "colgroup";
}
export interface TheadAttributes extends GlobalAttributes {}
export interface TrAttributes extends GlobalAttributes {}

export interface DetailsAttributes extends GlobalAttributes {
  open?: boolean;
}
export interface DialogAttributes extends GlobalAttributes {
  open?: boolean;
}
export interface SummaryAttributes extends GlobalAttributes {}

export interface SlotAttributes extends GlobalAttributes {
  name: string;
}
export interface TemplateAttributes extends GlobalAttributes {
  readonly content: unknown;
}

export interface CanvasAttributes extends GlobalAttributes, Sized {}
export interface ScriptAttributes extends GlobalAttributes {
  async?: boolean;
  crossorigin?: string;
  defer?: string;
  fetchpriority?: "high" | "low" | "auto";
  integrity?: string;
  nomodule?: boolean;
  nonce?: string;
  refererpolicy?: ReferrerPolicy;
  src: string;
  type?: "application/javascript" | "module" | string;
}
export interface NoscriptAttributes extends GlobalAttributes {}

export interface InsAttributes extends GlobalAttributes {
  cite?: string;
  datetime?: string;
}
export interface DelAttributes extends GlobalAttributes {
  cite?: string;
  datetime?: string;
}

export interface HTMLAttributesMap {
  a: AAttributes;
  abbr: AbbrAttributes;
  address: AddressAttributes;
  area: AreaAttributes;
  Col: ColAttributes;
  Th: ThAttributes;
  article: ArticleAttributes;
  aside: AsideAttributes;
  audio: AudioAttributes;
  b: BAttributes;
  bdi: BdiAttributes;
  bdo: BdoAttributes;
  blockquote: BlockquoteAttributes;
  br: BrAttributes;
  button: ButtonAttributes;
  canvas: CanvasAttributes;
  caption: CaptionAttributes;
  cite: CiteAttributes;
  code: CodeAttributes;
  colgroup: ColgroupAttributes;
  datalist: DatalistAttributes;
  dd: DdAttributes;
  del: DelAttributes;
  details: DetailsAttributes;
  dfn: DfnAttributes;
  dialog: DialogAttributes;
  div: DivAttributes;
  dl: DlAttributes;
  dt: DtAttributes;
  em: EmAttributes;
  embed: EmbedAttributes;
  fieldset: FieldsetAttributes;
  figcaption: FigcaptionAttributes;
  figure: FigureAttributes;
  footer: FooterAttributes;
  form: FormAttributes;
  h1: H1Attributes;
  h2: H2Attributes;
  h3: H3Attributes;
  h4: H4Attributes;
  h5: H5Attributes;
  h6: H6Attributes;
  header: HeaderAttributes;
  hr: HrAttributes;
  i: IAttributes;
  iframe: IframeAttributes;
  img: ImgAttributes;
  input: InputAttributes;
  ins: InsAttributes;
  kbd: KbdAttributes;
  label: LabelAttributes;
  legend: LegendAttributes;
  li: LiAttributes;
  main: MainAttributes;
  map: MapAttributes;
  mark: MarkAttributes;
  menu: MenuAttributes;
  meter: MeterAttributes;
  nav: NavAttributes;
  noscript: NoscriptAttributes;
  object: ObjectAttributes;
  ol: OlAttributes;
  optgroup: OptgroupAttributes;
  option: OptionAttributes;
  output: OutputAttributes;
  p: PAttributes;
  param: ParamAttributes;
  picture: PictureAttributes;
  portal: PortalAttributes;
  pre: PreAttributes;
  progress: ProgressAttributes;
  q: QAttributes;
  rp: RpAttributes;
  rt: RtAttributes;
  ruby: RubyAttributes;
  s: SAttributes;
  samp: SampAttributes;
  script: ScriptAttributes;
  section: SectionAttributes;
  select: SelectAttributes;
  slot: SlotAttributes;
  small: SmallAttributes;
  source: SourceAttributes;
  span: SpanAttributes;
  strong: StrongAttributes;
  sub: SubAttributes;
  summary: SummaryAttributes;
  sup: SupAttributes;
  table: TableAttributes;
  tbody: TbodyAttributes;
  td: TdAttributes;
  template: TemplateAttributes;
  textarea: TextareaAttributes;
  tfoot: TfootAttributes;
  thead: TheadAttributes;
  time: TimeAttributes;
  tr: TrAttributes;
  track: TrackAttributes;
  u: UAttributes;
  ul: UlAttributes;
  var: VarAttributes;
  video: VideoAttributes;
  wbr: WbrAttributes;
}
