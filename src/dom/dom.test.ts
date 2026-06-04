import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { patchNode, reconcileChildren, SVG_NAMESPACE_URI } from "./dom.ts";
import { button, div, input, p, span } from "./html.ts";
import { circle, line, rect, svg } from "./svg.ts";

describe("reconcileChildren", () => {
  it("keeps a by-reference child in place and reuses a same-tag sibling as the carrier", (t) => {
    // Arrange: a host with two children — a by-reference subtree holding a
    // focused input, and a same-tag sibling. Focus proves the by-reference
    // subtree is not detached: detaching moves focus to <body> synchronously.
    const field = input({ name: "title" });
    const reused = div(field);
    const sibling = p("drop");
    const host = div(reused, sibling);
    window.document.body.append(host);
    t.after(() => host.remove());
    field.focus();

    // Act: reconcile, passing the SAME reused reference plus a genuinely-fresh
    // same-tag <p>. Identity claims `reused`; the fresh <p> has no identity match
    // and positionally reuses the unclaimed same-tag `sibling` as its carrier.
    const fresh = p("fresh");
    reconcileChildren(host, [reused, fresh]);

    // Assert: the by-reference subtree stays attached (focus survives) and keeps
    // its slot; the fresh <p> is discarded and `sibling` is reused in place — the
    // carrier node is kept by reference, never rebuilt. (Step 1 reuses without
    // patching, so `sibling`'s own content is untouched here; later steps patch
    // the carrier's surface and children.)
    assert.strictEqual(
      window.document.activeElement,
      field,
      "the by-reference subtree was never detached",
    );
    assert.strictEqual(host.children.length, 2);
    assert.strictEqual(host.children[0], reused, "by-reference node kept");
    assert.strictEqual(
      host.children[1],
      sibling,
      "same-tag sibling reused as carrier",
    );
    assert.notStrictEqual(
      host.children[1],
      fresh,
      "the fresh node was discarded",
    );
    assert.ok(host.contains(sibling), "the reused sibling stays attached");
  });

  it("reuses a same-tag mounted node in place when a fresh node has no identity match", () => {
    // Arrange: fresh p() objects share no identity with the mounted ones, but
    // they match by position and tag — so they patch-reuse the mounted nodes
    // rather than rebuilding (the focus-loss anti-pattern this feature removes).
    const oldA = p("a");
    const oldB = p("b");
    const host = div(oldA, oldB);

    // Act: reconcile against freshly-allocated same-tag nodes.
    reconcileChildren(host, [p("a"), p("b")]);

    // Assert: the mounted nodes are kept by reference, never detached; order is
    // preserved. (Step 1 reuses in place without mutating, so text is unchanged.)
    assert.strictEqual(host.children.length, 2);
    assert.strictEqual(host.children[0], oldA, "same-tag node reused in place");
    assert.strictEqual(host.children[1], oldB, "same-tag node reused in place");
    assert.ok(host.contains(oldA), "the mounted node was never detached");
    assert.ok(host.contains(oldB), "the mounted node was never detached");
    assert.strictEqual(host.children[0].textContent, "a");
    assert.strictEqual(host.children[1].textContent, "b");
  });

  it("reorders reused children by reference", () => {
    // Arrange
    const a = p("a");
    const b = p("b");
    const c = p("c");
    const host = div(a, b, c);

    // Act: reverse the order, all entries by reference.
    reconcileChildren(host, [c, b, a]);

    // Assert: same objects, new order, nothing rebuilt.
    assert.strictEqual(host.children.length, 3);
    assert.strictEqual(host.children[0], c);
    assert.strictEqual(host.children[1], b);
    assert.strictEqual(host.children[2], a);
  });

  it("materializes string children into fresh text nodes", () => {
    // Arrange
    const host = div();

    // Act
    reconcileChildren(host, ["hello", p("x")]);

    // Assert: the string became a text node; order and content are preserved.
    assert.strictEqual(host.childNodes.length, 2);
    assert.strictEqual(
      host.childNodes[0].nodeType,
      3,
      "the string entry became a text node",
    );
    assert.strictEqual(host.textContent, "hellox");
  });

  it("removes all children when given an empty list", () => {
    // Arrange
    const host = div(p("a"), p("b"));

    // Act: the call-site translation of CLEAR — an empty desired list.
    reconcileChildren(host, []);

    // Assert
    assert.strictEqual(host.childNodes.length, 0);
  });

  it("inserts a new node between reused siblings without detaching them", () => {
    // Arrange
    const a = p("a");
    const b = p("b");
    const host = div(a, b);

    // Act: keep both siblings by reference, insert a fresh node between them.
    const mid = p("mid");
    reconcileChildren(host, [a, mid, b]);

    // Assert: the siblings are preserved in place; only the middle is new.
    assert.strictEqual(host.children.length, 3);
    assert.strictEqual(host.children[0], a);
    assert.strictEqual(
      host.children[1],
      mid,
      "new node inserted between siblings",
    );
    assert.strictEqual(host.children[2], b);
  });

  it("reconciles namespaced (SVG) children by reference", () => {
    // Arrange: matching is pure === and insertBefore/removeChild are
    // namespace-agnostic, so SVG nodes reconcile like any other.
    const dot = circle();
    const bar = rect();
    const root = svg(dot, bar);

    // Act: keep dot by reference, drop bar, insert a fresh segment.
    const seg = line();
    reconcileChildren(root, [dot, seg]);

    // Assert: dot is preserved by reference with its namespace intact.
    assert.strictEqual(root.childNodes.length, 2);
    assert.strictEqual(
      root.childNodes[0],
      dot,
      "namespaced node kept by reference",
    );
    assert.strictEqual(
      dot.namespaceURI,
      SVG_NAMESPACE_URI,
      "the reused node keeps its SVG namespace",
    );
    assert.strictEqual(
      root.childNodes[1],
      seg,
      "fresh namespaced node inserted",
    );
    assert.ok(!root.contains(bar), "the absent node was removed");
  });
});

describe("patchNode", () => {
  it("patches attributes — adds, updates, and removes to match the fresh node", () => {
    // Arrange: kept carries an attribute the fresh node lacks (to be removed),
    // one with a differing value (to be updated), and one identical; the fresh
    // node introduces a new attribute.
    const kept = div({ id: "old", title: "keep", lang: "en" });
    const fresh = div({ id: "new", title: "keep", role: "button" });

    // Act
    patchNode(kept, fresh);

    // Assert: kept's surface now mirrors the fresh node's attribute set exactly.
    assert.strictEqual(
      kept.getAttribute("id"),
      "new",
      "differing value updated",
    );
    assert.strictEqual(
      kept.getAttribute("title"),
      "keep",
      "identical value kept",
    );
    assert.strictEqual(
      kept.getAttribute("role"),
      "button",
      "new attribute added",
    );
    assert.ok(!kept.hasAttribute("lang"), "absent attribute removed");
  });

  it("transfers listeners replace-not-stack, leaving exactly one (fires once)", () => {
    // Arrange: kept already holds a click handler; the fresh node declares its
    // own click handler for the same event.
    const log: string[] = [];
    const kept = button({ events: { click: () => log.push("kept") } });
    const fresh = button({ events: { click: () => log.push("fresh") } });

    // Act
    patchNode(kept, fresh);
    kept.dispatchEvent(new window.Event("click"));

    // Assert: kept's stale handler is gone and the fresh handler is attached
    // exactly once — no stacking, no orphaned handler (metric 5).
    assert.deepStrictEqual(
      log,
      ["fresh"],
      "only the fresh handler fires, once",
    );
  });

  it("recurses into children, reusing a nested same-tag child in place", (t) => {
    // Arrange: kept holds a focused nested input; the fresh tree is the same
    // shape with a freshly-built input and changed surrounding text.
    const keptInput = input({ name: "title" });
    const kept = div(span("Title"), keptInput);
    window.document.body.append(kept);
    t.after(() => kept.remove());
    keptInput.focus();
    const fresh = div(span("Updated"), input({ name: "title" }));

    // Act
    patchNode(kept, fresh);

    // Assert: the nested input is reused (its focus survives) while the
    // surrounding text reflects the fresh tree — the patch recurses one level
    // down, applying identity-then-positional matching at depth.
    assert.strictEqual(
      kept.querySelector("input"),
      keptInput,
      "the nested input is reused, not rebuilt",
    );
    assert.strictEqual(
      window.document.activeElement,
      keptInput,
      "the nested input keeps focus through the recursive patch",
    );
    assert.ok(
      kept.textContent?.includes("Updated"),
      "the surrounding text reflects the fresh tree",
    );
  });
});

describe("reconcile children by identity", () => {
  it("keeps focus on a grandchild inside a reused child while a sibling is replaced", (t) => {
    // Arrange: a root mounted in the document with two children — a panel
    // holding a focused input (a grandchild of root), and a sibling to replace.
    const field = input({ name: "title" });
    const panel = div(span("Title"), field);
    const sibling = p("old");
    const root = div(panel, sibling);
    window.document.body.append(root);
    t.after(() => root.remove());

    field.focus();
    assert.strictEqual(
      window.document.activeElement,
      field,
      "precondition: the grandchild input holds focus before the update",
    );

    // Act: update root, passing the SAME panel reference back (so its subtree,
    // including the focused input, is reused) alongside a fresh sibling.
    root.update(panel, p("new"));

    // Assert: the reused panel is never detached, so the grandchild input keeps
    // focus; the sibling is the only child that gets replaced.
    assert.strictEqual(
      window.document.activeElement,
      field,
      "the grandchild input keeps focus across update()",
    );
    assert.ok(root.contains(field), "the reused input is still in the tree");
    assert.strictEqual(root.children.length, 2);
    assert.strictEqual(
      root.children[0],
      panel,
      "the reused panel is preserved by reference",
    );
    assert.strictEqual(
      root.children[1].textContent,
      "new",
      "the sibling was replaced",
    );
  });
});
