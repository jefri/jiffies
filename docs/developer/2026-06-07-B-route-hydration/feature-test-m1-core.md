# Route Hydration — Feature Test

Encodes the M1 runtime-core user story from
[design.md](./design.md) (§2 Navigation lifecycle, §3 Head reconciliation, §4
Hydration contract, and the Metrics "Run-once" / "Navigation correctness"
criteria).

## User Story

**Given** a visitor on one built page (`/`) of a multi-page SSG site — its
one-time `data-shell` `<head>` node (theme picker) is in place, its island is
hydrated, and its per-page `<title>`/`<meta>`/`__hydration` describe the home
page —

**When** they follow an in-app link to a second built page (`/b`),

**Then** the transition is *same-document*: the destination's already-built HTML
is fetched, its `<head>` is reconciled (the `data-shell` node is preserved by
identity — never re-inserted or re-run — while `<title>`, `<meta>`, and the
`__hydration` payload are replaced with the destination's), its `<body>` is
swapped in, its module script is imported, and its island hydrates with the
destination's props and responds to input — all without a full document reload,
and the navigation is reported exactly once.

This is the run-once payoff: because the one-time shell node is preserved across
the swap, a real inline theme script in it never re-runs (no color flip) and an
analytics bootstrap loads once, while each navigation still updates the title
and reports a virtual pageview through the `onNavigate` hook.

## What the test drives

The runtime auto-bootstraps on import in a browser, but jsdom has no Navigation
API to dispatch a real `navigate` event through. The test therefore drives the
**shared same-document core** the design defines — `navigate(url)`, which both
the Navigation API interceptor and the click/`popstate` fallback funnel into
(design §8) — and asserts the user-observable outcome directly:

- the destination HTML was fetched;
- the `[data-shell]` node is the *same object* afterward and is the only one (the
  destination's equivalent was not appended) — the run-once guarantee;
- `document.title` and `<meta name="description">` are the destination's;
- the destination's `import "<spec>";` was extracted and `import()`d (proved by a
  data: URL module that records its own execution);
- page A's island is gone, page B's island is present, hydrated with page B's
  payload, and a click runs its live handler;
- `onNavigate` fired exactly once with the destination URL and title.

The island is defined once at module load, modelling a shared client chunk
already in the ES module cache (the common case). The distinct "navigating to a
page whose component is **not yet defined** imports its chunk and defines the
element before hydration" case is an M1 inner-loop unit test per the design's
Verification section, not this end-to-end story.

## Test file

[`src/dom/navigation/navigation.test.ts`](../../../src/dom/navigation/navigation.test.ts)

It fails at the start: `./index.ts` does not exist, so the file fails to load
until the M1 runtime ships.
