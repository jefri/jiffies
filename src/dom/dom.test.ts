import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconcileChildren, SVG_NAMESPACE_URI } from "./dom.ts";
import { div, input, p, span } from "./html.ts";
import { circle, line, rect, svg } from "./svg.ts";

describe("reconcileChildren", () => {
  it("leaves a child passed back by reference in place, never detaching it", (t) => {
    // Arrange: a host with two children — a reused subtree holding a focused
    // input, and a sibling to drop. Focus proves the subtree is not detached:
    // detaching would synchronously move focus to <body>.
    const field = input({ name: "title" });
    const reused = div(field);
    const dropped = p("drop");
    const host = div(reused, dropped);
    window.document.body.append(host);
    t.after(() => host.remove());
    field.focus();

    // Act: reconcile, passing the SAME reused reference plus a fresh sibling.
    const fresh = p("fresh");
    reconcileChildren(host, [reused, fresh]);

    // Assert: reused stays attached (focus survives) and keeps its slot; the
    // absent sibling is removed and the fresh node takes its place.
    assert.strictEqual(
      window.document.activeElement,
      field,
      "the reused subtree was never detached",
    );
    assert.strictEqual(host.children.length, 2);
    assert.strictEqual(
      host.children[0],
      reused,
      "reused node kept by reference",
    );
    assert.strictEqual(host.children[1], fresh, "fresh node inserted in place");
    assert.ok(!host.contains(dropped), "the absent child was removed");
  });

  it("rebuilds fully when every child is a fresh node", () => {
    // Arrange: fresh p() objects share no identity with the mounted ones.
    const oldA = p("a");
    const oldB = p("b");
    const host = div(oldA, oldB);

    // Act
    reconcileChildren(host, [p("a"), p("b")]);

    // Assert: the mounted nodes are detached and replaced by the new ones.
    assert.strictEqual(host.children.length, 2);
    assert.ok(!host.contains(oldA), "the old node was detached");
    assert.ok(!host.contains(oldB), "the old node was detached");
    assert.notStrictEqual(host.children[0], oldA);
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
