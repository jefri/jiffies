# Public: how do hyperscript / component libraries structure the (attrs, children) signature, and what does least-surprise favor?

## Findings

### Low-level `h()` builders: attrs is a leading, optional, object-detected argument

The canonical hyperscript signature is `h(tag, attrs?, children?)`: a required tag, an
optional plain-object attrs (else `null`/`undefined`), then children. The attrs object is
detected by being a plain object, and may be omitted so children come directly after the
tag ([Mithril `m(selector, attributes, children)`](https://mithril.js.org/hyperscript.html),
[hyperhype/hyperscript](http://hyperhype.github.io/hyperscript/)). This is exactly Jiffies'
html-builder rule (`tag(attrs?, ...children)`, plain-object-or-child). So at the element
level, "attrs in a leading denormalized object" is the universal convention — Jiffies already
matches it.

### Component frameworks: ONE props object that mixes domain props with DOM attrs, attrs land on the root

The dominant component model is a single props object, not positional domain args:

- **React.** A component takes one props object; the idiomatic pattern is to destructure
  domain props and spread the rest onto the root element:
  `function Greeting({ name, ...restProps }) { return <div {...restProps}>Hi {name}</div> }`.
  The community names exactly this purpose — destructuring "separate[s] component-specific
  (domain) props from DOM/platform-specific attributes" and forwards the DOM ones to the
  element; `className` is *merged* with the component's base classes, not blindly overwritten
  ([react.dev: Passing Props](https://react.dev/learn/passing-props-to-a-component),
  [simonsmith.io: Handling props and class names](https://www.simonsmith.io/handling-props-and-class-names-in-react)).

- **Vue "fallthrough attributes."** `class`, `style`, `id`, and `v-on` listeners passed to a
  component but not declared as props are **automatically added to its single root element**,
  with `class`/`style` **merged** into the root's existing values. Components with multiple
  root nodes get no automatic fallthrough and must bind `$attrs` explicitly
  ([vuejs.org: Fallthrough Attributes](https://vuejs.org/guide/components/attrs.html)).

Both independently confirm the mechanism derived from Jiffies' own `fc.ts`/`form.ts`:
**one config object, destructure domain inputs, forward the remaining attrs (class/lang/style)
to the outermost element, merging class rather than replacing.** Jiffies' `update()` already
implements additive/merging class semantics (`classList.add`, `!`-prefix to remove), matching
Vue's merge behavior. Every jiffies-css component emits a single outer wrapper, so the
"single root → well-defined fallthrough" precondition holds for all of them.

### Falsification: is positional-leading domain args (the current jiffies-css style) well-precedented?

Searched specifically for the negation — component libraries that take positional domain
arguments before attrs. The opposite is documented as an anti-pattern: the TypeScript
community proposes that
[multi-parameter React function components should be errors](https://github.com/microsoft/TypeScript/issues/33104),
and React's own docs frame the single props object as a deliberate choice that "reduce[s] the
potential for errors that could occur with positional parameters" and makes the component
contract easier to reason about ([react.dev](https://react.dev/learn/passing-props-to-a-component),
[Vue props](https://vuejs.org/guide/components/props.html)). No mainstream component framework
was found that prefers positional domain args over a single props object. The current
`Alert(variant, ...)` / `Card(parts, ...)` / `StaticTabList(name, ...)` positional shape is
the outlier, not the norm.

## Conclusion (external prior-art)

Least surprise, across both the `h()` builder layer and the component layer, points to a
single leading config object: domain inputs + DOM attributes together, with the attribute
subset (class/lang/style/...) applied to — and class-merged onto — the single outermost
element. This corroborates the codebase finding (FC ctor, `form.ts:Select`). The
"additive positional attrs slot" alternative has prior art only at the raw-`h()` layer, not
at the component layer where these jiffies-css functions live.

## Sources

- [Mithril `m(selector, attributes, children)`](https://mithril.js.org/hyperscript.html) — canonical h() attrs/children rule (Tier 1)
- [hyperhype/hyperscript](http://hyperhype.github.io/hyperscript/) — original hyperscript signature (Tier 1)
- [react.dev: Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component) — single props object, destructure + spread (Tier 1)
- [Vue: Fallthrough Attributes](https://vuejs.org/guide/components/attrs.html) — class/style/id auto-forward + merge onto single root (Tier 1)
- [Vue: Props Declaration](https://vuejs.org/guide/components/props.html) — props-object contract (Tier 1)
- [simonsmith.io: Handling props and class names in React](https://www.simonsmith.io/handling-props-and-class-names-in-react) — domain/DOM prop separation, className merge (Tier 3)
- [microsoft/TypeScript#33104](https://github.com/microsoft/TypeScript/issues/33104) — positional-arg components treated as anti-pattern (Tier 3, falsification)
