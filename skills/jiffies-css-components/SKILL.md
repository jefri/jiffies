---
name: jiffies-css-components
description: Use when writing jiffies DOM code (TypeScript html/fc modules) for a UI that jiffies-css styles — cards, alerts, navigation, tabs, accordions, dialogs, property sheets, or form groups. Apply when composing a page from jiffies tag functions and wondering which component function to call or whether to add a class. This is the TypeScript-function counterpart of the jiffies-css-semantic-html skill (which covers raw HTML).
---

# Using jiffies-css Components

## Overview

`@davidsouther/jiffies/dom/components` wraps the semantic HTML patterns jiffies-css
styles by DOM hierarchy and ARIA role. Each function emits the exact structure the
framework targets, so you never hand-build wrapper elements or annotate classes.

Load this skill when writing jiffies DOM code. When writing raw HTML instead, load
[`jiffies-css-semantic-html`](https://github.com/jefri/jiffies-css/tree/main/skills/jiffies-css-semantic-html)
(in the jiffies-css repo) — both encode the same structural contract, expressed in
their respective language.

## When to use the module

Import the components, not the bare tag functions, whenever a jiffies-css-aligned
UI is needed:

```ts
import { Card, Alert, Nav, jiffiesCssLink } from "@davidsouther/jiffies/dom/components/index.ts";
```

Do not hand-build `article > (header / main / footer)` when `Card()` already
enforces that structure. Reaching for `div` + a class is the signal you should be
calling a component function.

## Component reference

| UI Pattern | Function | Common mistake |
|---|---|---|
| Elevated card | `Card({ header, footer }, ...body)` | `article(div(...))` without the `main` wrapper |
| Flat panel | `Panel({ header, footer }, ...body)` | `section(div(...))` without the `main` wrapper |
| Destructive alert | `Alert("error", ...)` / `Alert("warning", ...)` | `aside(...)` without `role` or `data-variant` |
| Info alert | `Alert("info", ...)` / `Alert("success", ...)` / `Alert("neutral", ...)` | same |
| Inline chip | `Chip("warning", "label")` | `span` with a `.badge` class |
| Accordion | `Accordion(summary, ...body)` | `div` with an `.accordion` class |
| Modal | `Modal(...children)` then `.update({ open: true })` | `div` with a `.modal` class |
| Navigation | `Nav([{ label, href, current }])` | `ul > li > a` without the `nav > ol` wrapper |
| Breadcrumb | `Breadcrumb([{ label, href, current }])` | `nav > ol` without the `span` wrapper |
| Property sheet | `PropertySheet({ label, value })` | `table` or `div` with a `.property` class |
| Form group | `FormGroup(legend, ...inputs)` | `div` with a `.form-group` class |
| JS tabs | `TabList({ label, selected, onSelect })` | `div.tabs > div.tab.active` |
| CSS-only tabs | `StaticTabList(name, { id, label, selected })` | same |
| Stylesheet link | `jiffiesCssLink()` in `<head>` | a bare Pico or Bootstrap CDN link |

`Alert` derives the ARIA role from the variant: `warning`/`error` become
`role="alert"`, and `info`/`success`/`neutral` become `role="status"`. The variant
always appears as `data-variant`.

## Sanctioned classes

The components emit **no** classes — structure and ARIA role carry all styling.
The same edge-class rule as the HTML skill applies: pass a `class` only for a class
jiffies-css actually defines, and only when the semantic element alone cannot
express the variant. The sanctioned set is the control variants (`.secondary`,
`.contrast`, `.outline`), the density/shape utilities (`.compact`, `.loose`,
`.fluid`, `.round`), and the layout utilities (`.grid`, `.flex`, `.row`,
`.inline`, the `.flex-*`/`.justify-*`/`.align-*` helpers, `.scroll-x`,
`.scroll-y`). Anything else is maintenance debt the framework will not style.

## Form components

The form controls live in `@davidsouther/jiffies/dom/form/form.ts`, not in this
module, because they carry logic beyond structural enforcement (preventDefault on
submit, option preparation, id/for derivation): `Form`, `Input`, `Select`,
`Dropdown`, `Radios`, `Checks`, `Switches`, `Button`, and the single-item `Radio`,
`Checkbox`, `Switch`. `Button` defaults to `type="button"` and takes an optional
sanctioned variant. The grouped controls emit `fieldset[role=group] > legend +
(input + label)*`.

## Loading the stylesheet

Every page using these components must include `jiffiesCssLink()` in its `<head>`.
SSG pages call it in their `head()` builder; static HTML fixtures use a plain
`<link rel="stylesheet" href="…jiffies-css…">` tag. Never import CSS directly from
TypeScript. To set a theme, set `data-theme` on `<html>` directly
(`document.documentElement.dataset.theme = "…"`); no helper is warranted.

## Common mistakes

- Hand-building a structure a component already enforces (`article` without `main`,
  `nav` without `ol`, `aside` without `role`).
- Adding BEM or utility classes the framework does not define.
- Passing a config object where a component expects its first child — a plain
  object is treated as attributes by the underlying tag functions.
- Forgetting `jiffiesCssLink()` in the `<head>`, leaving the page unstyled.
- Pointing the stylesheet link at Pico or another framework instead of jiffies-css.
