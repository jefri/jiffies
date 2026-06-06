# Refactor Plan: jiffies-css Components (post-Step-4, feature green)

Scope: files touched in the inner loop so far — `link.ts`, `card.ts`,
`alert.ts`, `nav.ts`, `index.ts`, `components.test.ts`.

Assessment: the four implementation files are already well-factored. Each shares
its variant via a single helper (`cardLike`, `navList`) or constant
(`JIFFIES_CSS_CDN`, `ALERT_ROLE`); comments explain why, not what; no dead code,
no long methods, no magic constants. No production refactoring warranted.

One test smell found:

- [x] **Three-Strikes / inconsistent assertion** `components.test.ts` — the
  "emits no class" check is repeated five times (Card, Alert, Chip, Nav,
  Breadcrumb) and is inconsistent: some assert only the root
  (`getAttribute("class")`), some only descendants (`querySelectorAll("[class]")`).
  Resolution: extract `assertNoClass(root)` that checks both the root element and
  all descendants, and call it from each component test. Tightens coverage
  uniformly while removing the duplication.

Deferred: none.

## Final pass (post-Step-6, full topic surface)

Scope extended to the components added in Steps 5-6 (`accordion.ts`, `modal.ts`,
`property.ts`, `tabs.ts`, components `form.ts`, `children.ts`), the `src/dom/form/`
refinements (`form.ts`, `form.app.ts`), and `SKILL.md`.

Assessment: the components module is well-factored throughout — shared helpers
(`cardLike`, `navList`, `toChildren`), single-source constants (`JIFFIES_CSS_CDN`,
`ALERT_ROLE`), and a consistent setAttribute idiom for non-typed attrs. The
`form.ts` additions (`choiceGroup`, `slug`, the choice/single control wrappers,
`Button`) share their structure via `choiceGroup` and are clean.

One smell found:

- [x] **Inconsistent helper extraction / duplicated magic string** `tabs.ts` —
  `TabList` and `StaticTabList` each build `div(...) + setAttribute("role",
  "tablist")` inline. The module's own convention extracts shared structure at two
  uses (`cardLike` for Card/Panel, `navList` for Nav/Breadcrumb); tabs.ts diverged
  and repeats the `"tablist"` role string. Resolution: extract a `tablist(...children)`
  helper, matching the module convention and centralizing the role string.

Deferred (pre-existing, outside this topic's changes):

- `src/dom/form/form.ts:33` **Suppressed type error** — `Input` carries a
  `@ts-expect-error` on the `input(attrs)` cast. Predates the topic; resolving it
  risks behavior change to the form module's typing. Leave for a form-typing pass.
- `src/dom/form/form.ts:87-94` **`Dropdown` indirection** — convoluted options
  forwarding. Predates the topic; not touched by the jiffies-css work.
