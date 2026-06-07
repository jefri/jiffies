# Form Controls — Demo Page, Feature Test & Typing Cleanup

## Problem Statement

`src/dom/form/form.ts` carries two pre-existing type smells, and the module's
controls are under-covered. The cleanup is risky without a behavioral net, so
this topic delivers three things in order: a **demo page** exercising every
control, a **feature test** pinning its rendered DOM, then the **typing fix**.

**Coverage gap (do first).** `Select`, `Dropdown`, and `Option` have no callers
outside `form.ts`, no unit tests, and no demo. `form.test.ts` covers
`Button`/`Radios`/`Checks`/`Switches`/`Radio`/`Checkbox`/`Switch`; the orphaned
`form.app.ts` (`App` export, referenced nowhere) shows only `Form` + `Input`.
Refactoring the untested `Select`/`Dropdown` blind is the actual hazard.

**Smell 1 — suppressed conversion in `Input`** (form.ts:33). `Input` accepts the
curated `InputAttributes` but passes it to the `input()` factory, which wants
`Attrs<HTMLInputElement>`. The conversion is guarded by `// @ts-expect-error`.
Removing it produces:

```text
TS2352: Conversion of type 'InputAttributes' to type 'Partial<Omit<{...}> & object & DomAttrs>'
may be a mistake because neither type sufficiently overlaps with the other.
  Types of property 'role' are incompatible.
    Type '"switch" | "switch-disabled"' is not comparable to type '"button" | "list" | "listbox"'.
```

The root cause is `DomAttrs.role` in `src/dom/dom.ts:35`, an arbitrary
three-value union (`"button" | "list" | "listbox"`) that cannot even express the
`role="switch"` the form module itself sets (`Switch` builds
`Input({ ...attrs, type: "checkbox", role: "switch" })`, form.ts:151). The union
is simply wrong, and the suppression hides that.

**Smell 2 — convoluted option forwarding in `Dropdown`** (form.ts:87). `Dropdown`
takes a `...options` rest parameter, then branches on
`typeof options[0] === "string"` to decide whether the varargs *are* the option
list or the first vararg *is* the option list. `Select` additionally casts
`attrs.options as string[]` even though `prepareOptions` accepts the full union.
Two calling conventions are conflated through one indirection.

Both smells predate the components work.

## Prior Art

- **Two attribute type systems.** `Attrs<E>` (`src/dom/dom.ts`), derived from the
  DOM lib types and intersected with `DomAttrs`, is spoken by every element
  factory and most call sites. The hand-written `*Attributes` interfaces
  (`src/dom/types/html.ts`) carry tighter per-field unions plus an
  `aria-${string}` index signature (via `AriaAttributes`); `form.ts` consumes
  them as its public contract. They do **not** reconcile cleanly (see
  Alternatives), so the decision is to keep the curated `*Attributes` and fix the
  underlying `role` bug.
- **Page shape.** `ssg.ts` renders a `PageModule` — `default(): Node | Node[]`,
  optional `head`/`lang`/`clientModules`. `ssg/main.ts` is empty; there is no
  page registry, so pages are passed directly to `build({ pages })`. A demo page
  is therefore a `PageModule` that a feature test imports and renders directly.
- **Test style.** Unit tests (`form.test.ts`) call a helper and assert on the
  returned `Element`. Feature tests use the `*.feature.test.ts` convention
  (`src/dom/components/components.feature.test.ts`): render a composed view, then
  `querySelector` against the live DOM.

## Metrics

Typing-fix metrics verified by prototyping, compiling, testing, then reverting.

- `npx tsc --noEmit` exits 0 with **zero** `@ts-expect-error`, and no casts in
  the `Input`/`Select` bodies (`as string[]` and the suppressed
  `as Attrs<HTMLInputElement>` both deleted). Baseline passes today *with* the
  suppression; confirmed it also passes *without* it once the fix is applied.
- `npm test` green; existing `form.test.ts`, `fc.test.ts`, `dom.test.ts` pass
  unchanged (confirmed 21/21 for the touched suites).
- `biome check --write` clean.
- New feature test exercises and asserts the rendered DOM of **every** exported
  control, giving `Select`/`Dropdown`/`Option` their first behavioral coverage.
- The demo page renders all controls; `form.ts` runtime behavior (DOM output) of
  unchanged helpers is identical before and after the typing fix.
- Public export surface unchanged: `Form`, `Input`, `Select`, `Dropdown`,
  `Option`, `Button`, `Radio`/`Checkbox`/`Switch`, `Radios`/`Checks`/`Switches`.

## Specification

### 1. Demo page (`form.app.ts`)

Promote the orphaned demo to a `PageModule`: export `default` returning a
`main(...)` that showcases the full control set in one accessible form —
`Input` (text/email, valid/invalid/disabled/readonly variants, retaining the
existing `aria-invalid` examples), `Select` and `Dropdown` (the new
`(attrs, options)` signature, with `string[]` and `Record` option inputs and a
preselected value), `Radios`/`Checks`/`Switches`, the single-item
`Radio`/`Checkbox`/`Switch`, and `Button`. Keep it dependency-light and
SSG-renderable (`default()` returns DOM nodes). This both fills the demo gap and
is the vehicle the feature test renders.

### 2. Feature test (`src/dom/form/form.feature.test.ts`)

A single executable test encoding the user story: *a developer assembles a form
page from the jiffies-css controls, and it renders the correct accessible HTML.*
It imports the demo page's `default()`, renders once, and asserts the rendered
structure per control family — notably the previously-untested ones:

- `Select`/`Dropdown` → `label > select` containing one `option` per entry, with
  `value`/text matching the input and the preselected option marked `selected`.
- `Input` → `label > input` with the given `id`/`type`/`placeholder`, and
  `aria-invalid` reflected.
- Grouped controls → `fieldset[role=group] > legend + (input + label[for])*`;
  `Switch`/`Switches` inputs carry `role="switch"`.

This test acts as the TDD net for the refactor. Because the demo uses
`Dropdown`'s **new** `(attrs, options)` signature, the test is red until the
typing fix lands, then green — and stays green as the DOM-preserving edits to
`Input`/`Select`/`Option` are made.

### 3. Typing fix

**`dom.ts`:** widen `DomAttrs.role` from `"button" | "list" | "listbox"` to
`string` (the DOM `role` attribute is an open string; the union was incomplete
and was the source of the conflict). *Alternative:* a complete curated `AriaRole`
union — rejected as brittle, but a drop-in swap if tighter typing is later
wanted. Once `role` is `string`, `InputAttributes`/`OptionAttributes` become
directly **assignable** to the factories, so both casts delete outright.

```ts
// Input/Radio/Checkbox/Switch signatures UNCHANGED — only the body loses the cast:
export const Input = (attrs: InputAttributes, ...children: DenormChildren[]) =>
  label(input(attrs), ...children);                 // was: input(attrs as Attrs<…>) + @ts-expect-error
export const Option = (attrs: OptionAttributes) => option(attrs);   // was: option(attrs as Attrs<…>)

// Dropdown/Select: name the option shape once, drop the cast and the varargs branch:
export type OptionConfig = { label: string; disabled?: boolean; selected?: boolean };
export type OptionsInput = string[] | Record<string, string | OptionConfig>;

export const Select = (
  attrs: { options: OptionsInput; selected?: string } & SelectAttributes & LabelAttributes,
) =>
  label(
    { style: attrs.style ?? {} },
    select({ events: attrs.events ?? {} }, ...prepareOptions(attrs.options, attrs.selected).map(Option)),
  );                                                 // prepareOptions(attrs.options) — no `as string[]`

export const Dropdown = (
  attrs: { selected?: string } & SelectAttributes,
  options: OptionsInput,
) => Select({ ...attrs, options });                  // single signature, no varargs branch
```

`prepareOptions` takes `OptionsInput` and keeps returning
`Parameters<typeof Option>[0][]` (`OptionAttributes[]`). `SelectAttributes` has
no `options` member, so the intersection does not collide with the literal
`options` field.

### Out of scope

`Form` is unchanged. Its submit wrapper calls `submit(event)`, which depends on
the curated callable `EventHandler`; its existing `as Attrs<HTMLFormElement>`
cast already type-checks (`FormAttributes` declares no `role`). All `types/html`
imports in `form.ts` are retained.

### Failure modes

- Widening `DomAttrs.role` to `string` loosens `role` typing project-wide.
  Impact is minimal: other `role` uses (`tabs.ts`, `choiceGroup`) set it via
  `setAttribute`, not typed attrs.
- The demo page grows `form.ts`'s controls' first integration surface; if a
  control's accessible structure is wrong, the feature test surfaces it as a real
  failure rather than a typing nicety. This is intended.

## Alternatives

- **Align `form.ts` to `Attrs<E>`.** Rejected after compiling it: `Attrs<E>` has
  no `aria-*` index signature, so `Input({ "aria-invalid": "false" })` in
  `form.app.ts` stops compiling (TS2353); and `{ options } &
  Attrs<HTMLSelectElement>` collides on `HTMLSelectElement.options`, yielding the
  impossible `OptionsInput & (string|number|boolean)`. Recovering aria support
  would mean broadening the shared `DomAttrs` for the whole codebase.
- **Legal cast instead of assignment.** Subsumed: once `role` is widened the
  conversion is a clean assignment, so the cast is unnecessary and removed.
- **`as unknown as Attrs<…>`.** Rejected: launders the mismatch; equivalent to
  the suppression the task exists to remove.
- **Unit tests instead of a demo-page feature test.** Per-helper unit tests would
  cover `Select`/`Dropdown` too, but a demo page additionally fills the missing
  demo and gives the controls one realistic composed surface. The feature test is
  the requested vehicle; targeted unit tests remain a fine follow-up.
- **Wire the factories to the curated `HTMLElements` map.** Full reconciliation
  of the two type systems — correct end-state, large, out of scope.

## Summary

Establish a safety net first — a demo page (`form.app.ts` as a `PageModule`
showcasing every control) and a `form.feature.test.ts` asserting the rendered
accessible DOM, closing the `Select`/`Dropdown`/`Option` coverage gap. Then apply
the typing fix: widen `DomAttrs.role` to `string`, delete the `@ts-expect-error`
and both casts (no signature changes to `Input`), and give `Dropdown` a single
`(attrs, options)` signature. The feature test is red on the new `Dropdown`
signature until the fix lands, then green; all other edits are DOM-preserving.

**Deferred decisions**

- Full reconciliation of the two attribute type systems.
- Whether `DomAttrs.role` should become a curated `AriaRole` union vs `string`.
- A page registry / `ssg/main.ts` entry that includes the demo page in an actual
  SSG build (the page is build-ready, but nothing registers it yet).
