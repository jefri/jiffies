# Codebase: how should jiffies-css components accept attrs (class/lang/...) for the outer element, by Jiffies' own conventions?

## Question

Every jiffies-css component (`Card`, `Alert`, `Nav`, `Modal`, ...) should accept a
`DenormAttrs` — especially `class` and `lang` — applied to its outermost element.
Where, by the principle of least surprise *as already practiced in Jiffies*, should
that argument live in each signature?

## Findings

### Two argument shapes exist in Jiffies, both put attrs in a leading object

**1. HTML/SVG builders (`dom/html.ts`, `dom/svg.ts`).** A tag is
`tag(attrs?, ...children)` where `attrs: DenormAttrs<E> = Attrs<E> | DenormChildren`
(`dom/dom.ts:47`). `Attrs<E>` is `Partial<elementProps & DomAttrs>` (`dom/dom.ts:41`) —
pure DOM attributes (`class`, `style`, `role`, `events`, and the element's own typed
properties). The first arg is *denormalized*: a plain object (no `nodeType`) is attrs,
anything else (string / Node / `CLEAR`) is the first child (`normalizeArguments`,
`dom/dom.ts:74`; documented in `dom/SKILL.md` "The argument rule").

**2. Functional components (`dom/fc.ts`).** This is the established **component**
convention, and it is the most load-bearing precedent for the jiffies-css components:

- `FCComponentCtor = (attrs?: Attrs<Props> | DenormChildren, ...children) => ...`
  (`fc.ts:27`).
- `Attrs<S> = S & Partial<DomAttrs>` (`fc.ts:10`). The first argument **merges the
  component's domain props with the DOM attributes** (`class`, `style`, `events`) in one
  object.
- On update, `update(this, this.#attrs, [])` (`fc.ts:57`) applies that merged object to
  the host element, so `class`/`style` set in the same object that carries the props
  land on the **outermost element** automatically.

So Jiffies' answer to "a component that takes both domain inputs and DOM attrs" already
exists: **one leading object, props + `Partial<DomAttrs>`, attrs flow to the element.**

### `dom/form/form.ts` confirms the object-first convention for plain (non-FC) components

The form module's plain function components are all object-first:

- `Form(attrs: FormAttributes, ...children)` (`form.ts:20`)
- `Input(attrs: InputAttributes, ...children)` (`form.ts:30`)
- `Select(attrs: { options: ...; selected?: string } & SelectAttributes & LabelAttributes)`
  (`form.ts:39`) — **the direct template**: domain fields (`options`, `selected`) merged
  with element-attribute types (`SelectAttributes & LabelAttributes`) in a single
  first-arg object, the attrs portion forwarded to the underlying element.

The single counterexample in that file is `Button(variant?: ButtonVariant, ...children)`
(`form.ts:55`) — a positional-leading domain arg, exactly the shape the new jiffies-css
components use (`Alert(variant, ...)`, `Card(parts, ...)`, `Nav(items)`, `StaticTabList(name, ...)`).

### The jiffies-css components are the inconsistent minority

`src/components/*.ts` (Card, Panel, Alert, Chip, Nav, Breadcrumb, Accordion, Modal,
PropertySheet, FormGroup, TabList, StaticTabList, jiffiesCssLink) take ad-hoc positional
domain args and accept **no** DOM attrs at all. They match the html-builder *spelling*
("a component is a fancy element") for `Modal`/`Alert` but diverge from the dominant
FC / form-module component convention, and they have no home for `class`/`lang`.

### Applying the convention has a known refinement: don't reflect domain props

`FC.update` passes the *whole* merged object (props included) to `update()`, which
`setAttribute`s every key. That reflects domain props as attributes — the `items="wash,fold"`
noise `docs/developer/TASKS.md` flags for cleanup. A plain component can do better:
destructure the known domain props out and forward only the remaining attrs to the
element, e.g. `const { variant, ...attrs } = config; aside(attrs, ...children)`. The html
builder already applies `class`/`lang`/`style`/`role`/`events` from `attrs`; no new
mechanism is needed.

## Conclusion (codebase-internal)

The least-surprising shape *for a Jiffies user* is the FC / `form.ts:Select` shape: a
single leading config object that merges the component's domain inputs with
`Partial<DomAttrs>` (plus permitted HTML attrs like `lang`), with the attribute subset
applied to the outermost element. This is the "uniform config object" option. The
"additive DenormAttrs slot" option matches only the html-builder spelling, contradicts
the FC/form-module component convention, and yields inconsistent attr positions across
components.

## Sources

- [1] `src/dom/dom.ts` (Attrs/DenormAttrs/normalizeArguments) [896ddb4]
- [2] `src/dom/fc.ts` (FCComponentCtor, `Attrs<S> = S & Partial<DomAttrs>`, update apply) [896ddb4]
- [3] `src/dom/form/form.ts` (Form/Input/Select object-first; Button positional) [896ddb4]
- [4] `src/components/*.ts` (current positional-leading jiffies-css components) [896ddb4]
- [5] `src/dom/SKILL.md` (the argument rule; `.update(attrs?, ...children)`) [896ddb4]
- [6] `docs/developer/TASKS.md` (reflected-attr noise wart) [896ddb4]
