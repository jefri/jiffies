import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FC } from "./fc.ts";
import { button, div, form, input, label, small } from "./html.ts";

const Input = FC<{
  placeholder: string;
  name: string;
  required?: boolean;
  type?: string;
}>("fc-input", (_el, attrs, children) =>
  label(attrs.placeholder ?? attrs.name, input(attrs), ...children),
);

// A functional-first FC: its render fn allocates a brand-new label + input on
// every call, sharing no node references between renders. This is exactly the
// shape that defeats today's identity-only reconcile at the FC boundary.
const Field = FC<{ label: string }>("fc-field", (_el, attrs) =>
  label(attrs.label, input({ name: "title", type: "text" })),
);

describe("FC", () => {
  it("creates FCs", () => {
    const f = form(
      { action: "#", method: "POST" },
      div(
        { class: "grid" },
        Input({
          name: "firstName",
          placeholder: "First Name",
          required: true,
        }),
        Input({
          name: "lastName",
          placeholder: "Last Name",
          required: true,
        }),
      ),
      Input(
        { name: "email", type: "email", placeholder: "E-Mail" },
        small("We'll never share your information."),
      ),
      button({ type: "submit" }, "Submit"),
    );

    assert.strictEqual(f.children.length, 3);
    assert.strictEqual(f.querySelectorAll("input[required]").length, 2);
    assert.strictEqual(f.querySelectorAll('input[name="firstName"]').length, 1);
  });
});

describe("FC render reuses stable child references", () => {
  it("preserves a focused input inside FC output across a re-render", (t) => {
    // Arrange: mount an FC whose render fn rebuilds a fresh label + input every
    // call. Focus the input and leave a text selection — both ride on the live
    // node, so they only survive if that exact node is reused, not rebuilt.
    const field = Field({ label: "Title" });
    window.document.body.append(field);
    t.after(() => field.remove());

    const input1 = field.querySelector("input");
    assert.ok(input1, "precondition: the FC rendered an input");
    input1.value = "Hello";
    input1.focus();
    input1.setSelectionRange(1, 3);
    assert.strictEqual(
      window.document.activeElement,
      input1,
      "precondition: the input holds focus before the re-render",
    );

    // Act: re-render the FC with new attrs. Same logical tree, freshly
    // allocated nodes — the case that defeats identity-only reconcile today.
    field.update({ label: "Updated" });

    // Assert: the FC genuinely re-rendered (label text changed) ...
    assert.ok(
      field.textContent?.includes("Updated"),
      "the FC re-rendered with the new attrs",
    );
    // ... yet the nested input is the SAME node, still focused, selection and
    // connection intact — identity survived the re-render.
    const input2 = field.querySelector("input");
    assert.strictEqual(input2, input1, "the input node is reused, not rebuilt");
    assert.strictEqual(
      window.document.activeElement,
      input1,
      "the input keeps focus across the re-render",
    );
    assert.strictEqual(input1.selectionStart, 1, "selection start survives");
    assert.strictEqual(input1.selectionEnd, 3, "selection end survives");
    assert.ok(field.contains(input1), "the input is still connected");
  });
});
