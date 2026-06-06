import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, it } from "node:test";
import { renderToString } from "../dom/render.ts";
import { discoverPages } from "./discover.ts";

const ssgDir = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(ssgDir, "../../test/fixtures");

// User Story:
//
// A site author creates pages/blog/[id]/page.ts with a generateStaticParams()
// export that returns [{ id: "hello" }, { id: "world" }] and a default()
// function that renders each post's id into its body.
//
// When they run the SSG build, discoverPages() expands the template route into
// two concrete PageDescriptors — /blog/hello and /blog/world — and calling
// default() on each produces HTML that reflects the correct id value, without
// any changes to build() or the CLI.

describe("ssg/discover — dynamic route expansion", () => {
  it("expands [id] segments into concrete routes and forwards params to default()", async () => {
    // Given: test/fixtures/ssg-dynamic/pages/blog/[id]/page.ts exports
    //   generateStaticParams returning [{ id: "hello" }, { id: "world" }]
    //   and default(params) that renders params.id into a <p> element.

    // When: discoverPages is called on that project root.
    const descriptors = await discoverPages(
      join(fixturesDir, "ssg-dynamic"),
      "pages",
    );

    // Then: exactly two descriptors are produced — one per param set.
    assert.strictEqual(descriptors.length, 2, "one descriptor per param set");

    const routes = descriptors.map((d) => d.route).sort();
    assert.deepStrictEqual(routes, ["/blog/hello", "/blog/world"]);

    // And: each descriptor's default() returns content that reflects its param.
    for (const { route, module } of descriptors) {
      const id = route.split("/").at(-1)!;
      const node = await module.default();
      const html = renderToString(node);
      assert.match(
        html,
        new RegExp(id),
        `page for ${route} must render its id param`,
      );
    }
  });
});
