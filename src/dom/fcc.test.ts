import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  reconcileChildren,
  SVG_NAMESPACE_URI,
  XHTML_NAMESPACE_URI,
} from "./dom.ts";
import { FCC } from "./fc.ts";
import { div, h2, p, section } from "./html.ts";
import { buildPayload, start } from "./hydrate.ts";
import { circle, g, svg } from "./svg.ts";

// A containerless SVG component. Its boundary is a real <g> marked data-fc, and
// the render callback returns children (the FC-mirror contract). The callback
// allocates fresh circles on every call, sharing no node references between
// renders. That is the shape that defeats an identity-only reconcile at the
// boundary.
const Gauge = FCC<{ value: number }>("gauge", g, (_el, attrs) => [
  circle({ r: 10 }),
  circle({ class: "needle", r: 2, cx: attrs.value }),
]);

describe("FCC containerless SVG component", () => {
  it("renders SVG nodes directly into <svg> with no HTML host, and reuses nodes across re-render", () => {
    // Arrange + Act: build the component and place it directly inside an <svg>.
    const gauge = Gauge({ value: 5 });
    const root = svg({ viewBox: "0 0 100 100" }, gauge);
    window.document.body.append(root);

    // The boundary is a real SVG element marked data-fc, sitting directly in the
    // <svg>. No HTML custom element wraps it.
    assert.strictEqual(
      gauge.namespaceURI,
      SVG_NAMESPACE_URI,
      "the boundary is in the SVG namespace",
    );
    assert.strictEqual(
      gauge.localName,
      "g",
      "the boundary is a real <g>, not an HTML custom element host",
    );
    assert.strictEqual(gauge.getAttribute("data-fc"), "gauge");
    assert.strictEqual(
      gauge.parentNode,
      root,
      "the boundary renders directly inside the <svg>",
    );

    // Its children are real SVG-namespace nodes.
    const needle1 = gauge.querySelector(".needle");
    assert.ok(needle1, "the component rendered the needle");
    assert.strictEqual(
      needle1.namespaceURI,
      SVG_NAMESPACE_URI,
      "the child circle is in the SVG namespace",
    );
    assert.strictEqual(needle1.getAttribute("cx"), "5");

    // Act: re-render with new attrs. Same logical tree, freshly allocated nodes.
    gauge.update({ value: 42 });

    // Assert: the nested node is the SAME node, its attribute patched in place.
    // Identity survived the re-render through the marked boundary.
    const needle2 = gauge.querySelector(".needle");
    assert.strictEqual(
      needle2,
      needle1,
      "the needle node is reused, not rebuilt",
    );
    assert.strictEqual(
      needle2?.getAttribute("cx"),
      "42",
      "the reused node reflects the new attr",
    );
  });

  it("hydrates a server-rendered marked boundary through start()", (t) => {
    // Arrange — SERVER: an inert, parsed <g data-fc="gauge"> with a stale child
    // and no wired update() (the platform never upgrades a data-fc element). A
    // payload carries the unit's props by document-order index.
    const script = window.document.createElement("script");
    script.type = "application/json";
    script.id = "__hydration";
    script.textContent = buildPayload([{ value: 7 }]);
    window.document.head.appendChild(script);

    const boundary = window.document.createElementNS(SVG_NAMESPACE_URI, "g");
    boundary.setAttribute("data-fc", "gauge");
    boundary.appendChild(
      window.document.createElementNS(SVG_NAMESPACE_URI, "circle"),
    );
    const root = svg({ viewBox: "0 0 100 100" });
    root.appendChild(boundary);
    // A dedicated container isolates this scan from any DOM other cases left in
    // the body.
    const container = window.document.createElement("div");
    container.appendChild(root);
    window.document.body.append(container);
    t.after(() => {
      script.remove();
      container.remove();
    });

    // Act — start() finds the data-fc unit, re-wires update()/[State] from the
    // registry (the top-level FCC("gauge", ...) call populated it), and
    // re-renders it against its indexed payload. The data-fc path is synchronous.
    start(container);

    // Assert — the SAME server boundary node was adopted, and its children were
    // rebuilt from the payload props.
    assert.strictEqual(
      container.querySelector("[data-fc='gauge']"),
      boundary,
      "start() adopted the server boundary; it did not replace it",
    );
    const needle = boundary.querySelector(".needle");
    assert.ok(needle, "the boundary rebuilt its children on hydration");
    assert.strictEqual(
      needle.getAttribute("cx"),
      "7",
      "the rebuilt child reflects the payload props",
    );
  });
});

// A containerless HTML component. Its boundary is a real <div> marked data-fc,
// host-free: <div> is not a registered custom element, so the marker is the only
// thing that makes the boundary a unit. The render callback allocates fresh HTML
// children on every call, sharing no node references between renders.
const Card = FCC<{ title: string }>("card", div, (_el, attrs) => [
  h2({ class: "title" }, attrs.title),
  p({ class: "body" }, "static body"),
]);

describe("FCC containerless HTML component", () => {
  it("renders HTML directly into a parent with no custom-element host, and reuses nodes across re-render", () => {
    // Arrange + Act: build the component and place it directly inside a <section>.
    const card = Card({ title: "Hello" });
    const root = section(card);
    window.document.body.append(root);

    // The boundary is a real <div> in the HTML namespace, marked data-fc, sitting
    // directly in the <section>. It is host-free: <div> is not a registered
    // custom element, so nothing wraps the unit but the marker.
    assert.strictEqual(
      card.namespaceURI,
      XHTML_NAMESPACE_URI,
      "the boundary is in the HTML namespace",
    );
    assert.strictEqual(card.localName, "div", "the boundary is a real <div>");
    assert.strictEqual(
      customElements.get("div"),
      undefined,
      "the boundary is not a registered custom element; data-fc is the only marker",
    );
    assert.strictEqual(card.getAttribute("data-fc"), "card");
    assert.strictEqual(
      card.parentNode,
      root,
      "the boundary renders directly inside the <section>",
    );

    // Its children are real HTML-namespace nodes.
    const title1 = card.querySelector(".title");
    assert.ok(title1, "the component rendered the title");
    assert.strictEqual(
      title1.namespaceURI,
      XHTML_NAMESPACE_URI,
      "the child is in the HTML namespace",
    );
    assert.strictEqual(title1.textContent, "Hello");

    // Act: re-render with new attrs. Same logical tree, freshly allocated nodes.
    card.update({ title: "Goodbye" });

    // Assert: the nested node is the SAME node, its content patched in place.
    // Identity survived the re-render through the marked boundary.
    const title2 = card.querySelector(".title");
    assert.strictEqual(title2, title1, "the title node is reused, not rebuilt");
    assert.strictEqual(
      title2?.textContent,
      "Goodbye",
      "the reused node reflects the new attr",
    );
  });

  it("stays opaque when its HTML parent reconciles", () => {
    // Arrange: the FCC <div> lives inside a parent. For HTML, the boundary is an
    // ordinary <div> to the reconciler; only data-fc marks it as a unit.
    const card = Card({ title: "Kept" });
    const parent = div(card);
    window.document.body.append(parent);
    const title = card.querySelector(".title");
    assert.ok(title, "precondition: the card rendered its title");

    // Act: reconcile the parent against a BRAND NEW <div data-fc="card"> carrying
    // a different title. Same nodeName, so the kept boundary is patched in place
    // rather than replaced. Without the marker, the parent's reconcile would
    // descend and rebuild the card's subtree from freshCard's children.
    const freshCard = Card({ title: "Injected", class: "patched" });
    reconcileChildren(parent, [freshCard]);

    // Assert: the original boundary survived (adopted, not replaced), its own
    // attrs were patched, but the reconcile did NOT descend — the nested node
    // identity is intact and freshCard's "Injected" title was never adopted.
    assert.strictEqual(
      parent.querySelector("[data-fc='card']"),
      card,
      "the parent kept the original boundary; it did not swap in freshCard",
    );
    assert.strictEqual(
      card.getAttribute("class"),
      "patched",
      "the boundary's own attrs were patched by the parent reconcile",
    );
    assert.strictEqual(
      card.querySelector(".title"),
      title,
      "the nested node identity survived; the parent reconcile stayed out of the unit",
    );
    assert.strictEqual(
      title.textContent,
      "Kept",
      "the unit kept its own children; freshCard's title was not adopted",
    );
  });

  it("hydrates a server-rendered marked HTML boundary through start()", (t) => {
    // Arrange — SERVER: an inert, parsed <div data-fc="card"> with a stale child
    // and no wired update() (the platform never upgrades a data-fc element). A
    // payload carries the unit's props by document-order index.
    const script = window.document.createElement("script");
    script.type = "application/json";
    script.id = "__hydration";
    script.textContent = buildPayload([{ title: "Server" }]);
    window.document.head.appendChild(script);

    const boundary = window.document.createElement("div");
    boundary.setAttribute("data-fc", "card");
    boundary.appendChild(window.document.createElement("span"));
    // A dedicated container isolates this scan from any DOM the other cases left
    // in the body.
    const container = window.document.createElement("div");
    container.appendChild(boundary);
    window.document.body.append(container);
    t.after(() => {
      script.remove();
      container.remove();
    });

    // Act — start() finds the data-fc unit, re-wires update()/[State] from the
    // registry (the top-level FCC("card", ...) call populated it), and re-renders
    // it against its indexed payload. The data-fc path is synchronous.
    start(container);

    // Assert — the SAME server boundary node was adopted, and its children were
    // rebuilt from the payload props.
    assert.strictEqual(
      container.querySelector("[data-fc='card']"),
      boundary,
      "start() adopted the server boundary; it did not replace it",
    );
    const title = boundary.querySelector(".title");
    assert.ok(title, "the boundary rebuilt its children on hydration");
    assert.strictEqual(
      title.textContent,
      "Server",
      "the rebuilt child reflects the payload props",
    );
  });
});
