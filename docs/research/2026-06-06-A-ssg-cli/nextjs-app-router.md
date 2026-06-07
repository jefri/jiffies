# Next.js App Router: Routing Conventions and Build-Time Data Model

Research for a small static-site-generator CLI. Goal: extract the *conventions* and
*mental model* of Next.js App Router page discovery and data loading, not React/RSC
internals. Docs current as of Next.js 16.2.7. See **Sources** for citations.

---

## 1. File-system routing conventions (App Router)

### The `app/` directory model

Routing is defined by folders and a fixed set of special filenames placed in the
`app/` directory. Each special filename has a single, well-defined role [1][2].

| File             | Extensions          | Role                                                            |
| ---------------- | ------------------- | -------------------------------------------------------------- |
| `layout`         | `.js` `.jsx` `.tsx` | Shared UI wrapping a segment and all its descendants           |
| `page`           | `.js` `.jsx` `.tsx` | The publicly routable UI unique to a route (leaf)              |
| `loading`        | `.js` `.jsx` `.tsx` | Loading UI (auto-wrapped in a Suspense boundary)               |
| `not-found`      | `.js` `.jsx` `.tsx` | Not-found UI                                                   |
| `error`          | `.js` `.jsx` `.tsx` | Error UI (React error boundary)                                |
| `global-error`   | `.js` `.jsx` `.tsx` | Top-level error UI                                             |
| `template`       | `.js` `.jsx` `.tsx` | Like layout, but re-instantiated on navigation (not reused)    |
| `route`          | `.js` `.ts`         | API endpoint (HTTP handler); the non-UI sibling of `page`      |
| `default`        | `.js` `.jsx` `.tsx` | Fallback page for parallel routes                              |

**What makes a route publicly routable:** A folder is *not* publicly accessible until
a `page` (UI) or `route` (API) file is added to that segment. The docs state it
directly: "a route is **not publicly accessible** until a `page.js` or `route.js`
file is added to a route segment" and "A `page` file is **required** to make a route
segment **publicly accessible**" [1][2]. A `page` is always the **leaf** of the route
subtree [2]. For an SSG concerned only with pages, the rule reduces to: **the presence
of a `page` file is what turns a folder into a URL.**

### Folders map to URL segments

"Folders define URL segments. Nesting folders nests segments." [1] Each folder
represents one path segment; the special filename inside it (`page`, `layout`, etc.)
is *not* part of the URL. The route path is therefore derived purely from the chain of
folder names from `app/` down to the segment, with the filename stripped.

| File path                   | URL         |
| --------------------------- | ----------- |
| `app/page.tsx`              | `/`         |
| `app/blog/page.tsx`         | `/blog`     |
| `app/blog/authors/page.tsx` | `/blog/authors` |

A folder **without** a `page` (or `route`) file produces no public URL. It only
contributes structure: it can hold a `layout`, colocated components, or child folders
that themselves have pages. This is the mechanism behind safe **colocation** —
non-route files (`_components`, `lib`, etc.) can live next to pages without becoming
routable, because only `page`/`route` output is served [1].

### Nested layouts and the root layout

`layout` is the outermost component in a segment; it wraps `template`, `error`,
`loading`, `not-found`, and `page` of that segment [3]. Layouts **compose down the
tree recursively**: a child segment's content is passed to its parent layout as the
`children` prop, so the rendered tree is
`RootLayout > SectionLayout > ... > Page`. A layout receives `children` (required) and
optionally `params` (the accumulated dynamic params from root down to that layout) [3].

The **root layout** is special and mandatory: "The `app` directory **must** include a
**root layout**." It is the top-most layout (typically `app/layout.tsx`) and "**must**
define `<html>` and `<body>` tags," since no parent provides the document shell [3].
You can have **multiple root layouts** — any layout with no `layout` above it is a root
layout (achieved via route groups, or by omitting `app/layout.js`); navigating across
two root layouts causes a full page load rather than a client transition [3].

### Route groups, dynamic, and catch-all segments

- **Route group `(folder)`** — a folder wrapped in parentheses is "for organizational
  purposes and should **not be included** in the route's URL path" [1]. Used to group
  routes (by team/section), to apply a shared layout to a subset of routes, or to
  create multiple root layouts — all without affecting the URL.
  Example: `app/(marketing)/page.tsx` -> `/`; `app/(shop)/cart/page.tsx` -> `/cart`.
- **Private folder `_folder`** — prefixing a folder with `_` opts it and all
  subfolders out of routing entirely [1]. Useful for colocating implementation files.
- **Dynamic segment `[slug]`** — a single parameterized segment.
  `app/blog/[slug]/page.tsx` matches `/blog/my-first-post`; param value is a string.
- **Catch-all `[...slug]`** — matches one or more trailing segments.
  `app/shop/[...slug]/page.tsx` matches `/shop/clothing` and `/shop/clothing/shirts`;
  param value is a string array.
- **Optional catch-all `[[...slug]]`** — like catch-all but also matches the bare
  parent. `app/docs/[[...slug]]/page.tsx` matches `/docs`, `/docs/x`, `/docs/x/y` [1].

Dynamic values are delivered through the `params` prop (a promise as of Next.js 15)
[2][4]:

| Route                                | URL         | `params`                                |
| ------------------------------------ | ----------- | --------------------------------------- |
| `app/shop/[slug]/page.js`            | `/shop/1`   | `{ slug: '1' }`                         |
| `app/shop/[category]/[item]/page.js` | `/shop/1/2` | `{ category: '1', item: '2' }`          |
| `app/shop/[...slug]/page.js`         | `/shop/1/2` | `{ slug: ['1', '2'] }`                  |

### Deriving the route path from the file path (summary rule)

1. Start at `app/`. Walk folders down to the segment containing a `page` file.
2. Each folder name is one URL segment, **except**: parenthesized `(group)` folders
   and `_private` folders are dropped, and `[param]` / `[...param]` / `[[...param]]`
   folders become dynamic placeholders.
3. The filename (`page`) is stripped — it never appears in the URL.
4. The segment is public only if it contains a `page` (or `route`) file.

---

## 2. Build-time / static data loading

### Static vs dynamic rendering — what is static by default

A route is **statically rendered (prerendered) at build time by default**. Data
fetching is co-located in the component, and the route stays static unless something
forces it to be dynamic. The triggers that opt a route into **dynamic rendering**
(rendered per-request) are the use of **request-time APIs** whose values cannot be
known ahead of time [4][6]:

- `cookies()` and `headers()` — read per-request state.
- `searchParams` (the page prop) — "a **Request-time API** whose values cannot be
  known ahead of time. Using it will opt the page into **dynamic rendering** at
  request time." [2]
- `params` is *not* dynamic *if* sample values are provided via `generateStaticParams`
  [6].
- Uncached `fetch`: by default `fetch` is **not cached** and blocks rendering until
  complete; whether it forces dynamic behavior depends on the caching model in use
  [5][7].

Mental model: **everything is static unless it touches per-request input.** Pure
computation, module imports, filesystem reads, and synchronous DB queries all complete
during the build and are baked into the output [7].

### `generateStaticParams()` — pre-rendering dynamic routes at build time

`generateStaticParams` is the build-time enumeration hook for dynamic segments. It is
exported (named) alongside the default page component and "can be used in combination
with dynamic route segments to **statically generate** routes at build time instead of
on-demand at request time." It replaces the Pages Router `getStaticPaths` [4].

**Signature and return shape.** It returns (sync or async) an **array of objects**,
where each object is the set of dynamic segment values for one route. Property name =
segment name; property value = the value to fill in [4]:

| Route                            | Return type                               |
| -------------------------------- | ----------------------------------------- |
| `/product/[id]`                  | `{ id: string }[]`                        |
| `/products/[category]/[product]` | `{ category: string, product: string }[]` |
| `/products/[...slug]`            | `{ slug: string[] }[]`                    |

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await fetch('https://.../posts').then((r) => r.json())
  return posts.map((post) => ({ slug: post.slug })) // one object per page
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // ...
}
```

**How Next iterates it.** During `next build`, `generateStaticParams` runs *before*
the corresponding layouts/pages are generated; Next produces **one static page per
returned object**. So `[{ id: '1' }, { id: '2' }, { id: '3' }]` yields `/product/1`,
`/product/2`, `/product/3` [4]. Catch-all returns use arrays: `{ slug: ['a','1'] }` ->
`/product/a/1` [4].

**Nested dynamic segments.** A child segment's `generateStaticParams` runs once for
each param set its parent produced; the parent's params are passed in as
`options.params`. Bottom-up (child generates all segments at once) and top-down
(parent generates its segment, child receives it and generates the rest) are both
supported [4].

**`dynamicParams`** controls what happens for a dynamic value *not* returned by
`generateStaticParams`: `true` (default) renders it on demand; `false` makes
unspecified paths 404 [4][6]. Returning a partial list = some pages at build time, rest
on demand. Returning `[]` = none at build time (all on demand). You "must always return
an array... Otherwise, the route will be dynamically rendered." [4]

### Async Server Components — co-located `await` data loading

A page (or any server component) can be an `async` function that `await`s data directly
in the component body. Data fetching lives **with** the component that needs it — no
separate `getStaticProps`/loader step [5]:

```tsx
// app/blog/page.tsx — fetch API
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog')
  const posts = await data.json()
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}
```

```tsx
// app/blog/page.tsx — ORM / database
import { db, posts } from '@/lib/db'
export default async function Page() {
  const allPosts = await db.select().from(posts)
  return <ul>{allPosts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}
```

At build time these awaits resolve and the result is rendered into static HTML.
Identical `fetch` requests in the tree are memoized, so the same data can be fetched in
multiple components without prop-drilling [5]. For non-`fetch` sources, React `cache`
deduplicates [5][7].

### `generateMetadata()` / `generateStaticParams()` as named exports beside the default

The defining convention: **a route module default-exports the component and
named-exports its lifecycle/config hooks.** Metadata can be supplied two ways [8]:

```tsx
// Static: a named const export
export const metadata: Metadata = { title: '...', description: '...' }
export default function Page() { /* ... */ }
```

```tsx
// Dynamic: a named function export that may await data and read params
export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params
  const product = await fetch(`https://.../${id}`).then((r) => r.json())
  return { title: product.title }
}
export default function Page({ params, searchParams }: Props) { /* ... */ }
```

`generateMetadata` receives `{ params, searchParams }` plus a `parent` promise and
returns a `Metadata` object [8]. You cannot export both `metadata` and
`generateMetadata` from the same segment. Metadata is resolved root -> leaf and shallow
-merged across segments, with later (deeper) segments overwriting matching keys [8].

### Controlling build-time behavior: `fetch` caching, `force-static`, `dynamicParams`

These are exported as **named consts** from the module (page/layout/route) [7]:

```tsx
export const dynamic = 'auto'      // 'auto' | 'force-dynamic' | 'error' | 'force-static'
export const revalidate = false    // false | 0 | number (seconds)
export const fetchCache = 'auto'   // 'auto' | 'force-cache' | 'force-no-store' | ...
export const dynamicParams = true  // boolean
```

- **`dynamic`** [7]:
  - `'auto'` (default): cache as much as possible without blocking dynamic opt-ins.
  - `'force-static'`: force prerendering; `cookies`, `headers()`, and `useSearchParams`
    return empty values so the route stays fully static. This is the explicit "make
    this page static" switch.
  - `'force-dynamic'`: render per-request (equivalent to `cache: 'no-store'` on all
    fetches).
  - `'error'`: force static and error if any request-time API or uncached data is used
    (closest analog to Pages Router `getStaticProps`).
- **`revalidate`** [7]: `false` (default) caches indefinitely; `0` forces dynamic;
  a positive `number` sets ISR revalidation in seconds. Must be statically analyzable
  (`revalidate = 600` ok; `60 * 10` not). The lowest `revalidate` in a route wins.
- **`fetchCache`** [7]: advanced override of the default `cache` option for every
  `fetch` in the segment.
- **`dynamicParams`** [4][6]: `false` 404s any dynamic value not enumerated by
  `generateStaticParams`.
- Per-request `fetch` caching is also controllable inline:
  `fetch(url, { cache: 'force-cache' })` or `fetch(url, { next: { revalidate: 3600 } })`
  [7].

> Note: In Next.js 16, when the new **Cache Components** model is enabled
> (`cacheComponents: true`), the `dynamic`, `revalidate`, `fetchCache`, and
> `dynamicParams` segment configs are removed in favor of the `use cache` directive and
> `<Suspense>` boundaries; the const-export model above is the "previous model" still
> documented and supported for projects not on Cache Components [7][9]. For a small SSG,
> the const-export model is the cleaner convention to mirror.

---

## 3. The module contract (most important for the SSG)

A Next.js App Router page is **a single TypeScript/JavaScript module whose exports form
a contract**. The framework discovers the module by its filesystem location and reads a
fixed set of exports:

```tsx
// app/blog/[slug]/page.tsx

// 1. REQUIRED: the page UI. Default export. May be async and await data directly.
export default async function Page({
  params,         // dynamic segment values (Promise) for this route
  searchParams,   // query string (Promise); reading it forces dynamic rendering
}: PageProps<'/blog/[slug]'>) {
  const { slug } = await params
  const post = await getPost(slug) // co-located build-time data load
  return <article>{post.body}</article>
}

// 2. OPTIONAL: enumerate dynamic params to prerender at build time.
//    Returns one object per page. Drives the build loop.
export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

// 3. OPTIONAL: metadata. Either a static const...
export const metadata: Metadata = { title: 'Blog' }
//    ...or a dynamic function (mutually exclusive with the const).
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params
  return { title: (await getPost(slug)).title }
}

// 4. OPTIONAL: build-time behavior config, as named consts.
export const dynamic = 'force-static'   // force static generation
export const revalidate = 3600          // or ISR window in seconds
export const dynamicParams = false      // 404 unlisted params
```

**The contract, abstracted for a tiny SSG:**

| Export                     | Kind            | Purpose                                                       |
| -------------------------- | --------------- | ------------------------------------------------------------- |
| `default`                  | component (req) | The page UI; may be async and load its own data inline.       |
| `generateStaticParams`     | function (opt)  | Enumerates dynamic-segment values -> one output page each.    |
| `metadata`                 | object (opt)    | Static page metadata (title, description, ...).               |
| `generateMetadata`         | function (opt)  | Dynamic metadata; receives `params`; mutually excl. w/ above. |
| `dynamic` / `revalidate` / `dynamicParams` | const (opt) | Declarative knobs for static vs dynamic / regen.  |

Key takeaways to mirror:

1. **Discovery is filesystem-driven.** Folder path = URL (groups/private/dynamic
   folders excepted); a sentinel filename (`page`) marks a folder as a routable page;
   the filename is stripped from the URL.
2. **One module = one route's full behavior.** The default export is the UI; named
   exports declare params, metadata, and rendering policy. No external manifest.
3. **Data loading is co-located and direct.** The page is an async function that
   `await`s its data; results are baked at build time. Dynamic routes enumerate their
   instances through `generateStaticParams`, and the generator iterates that array to
   emit one static page per entry.
4. **Static-by-default.** A page is prerendered unless it touches request-time input;
   declarative consts (`dynamic = 'force-static'`, `revalidate`, `dynamicParams`) let
   the author override the default explicitly.

---

## Sources

[1] Next.js, "Project structure and organization," Next.js Documentation, v16.2.7.
    https://nextjs.org/docs/app/getting-started/project-structure

[2] Next.js, "page.js," File Conventions, Next.js Documentation, v16.2.7.
    https://nextjs.org/docs/app/api-reference/file-conventions/page

[3] Next.js, "layout.js," File Conventions, Next.js Documentation, v16.2.7.
    https://nextjs.org/docs/app/api-reference/file-conventions/layout

[4] Next.js, "generateStaticParams," Functions, Next.js Documentation, v16.2.7.
    https://nextjs.org/docs/app/api-reference/functions/generate-static-params

[5] Next.js, "Fetching Data," Getting Started, Next.js Documentation, v16.2.7.
    https://nextjs.org/docs/app/getting-started/fetching-data

[6] Next.js, "Caching" (Cache Components / rendering model), Getting Started, Next.js
    Documentation, v16.2.7. https://nextjs.org/docs/app/getting-started/caching

[7] Next.js, "Caching and Revalidating (Previous Model)," Guides, Next.js
    Documentation, v16.2.7.
    https://nextjs.org/docs/app/guides/caching-without-cache-components

[8] Next.js, "generateMetadata," Functions, Next.js Documentation, v16.2.7.
    https://nextjs.org/docs/app/api-reference/functions/generate-metadata

[9] Next.js, "Route Segment Config," File Conventions, Next.js Documentation, v16.2.7.
    https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
