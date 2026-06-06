import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Button,
  Checkbox,
  Checks,
  Radio,
  Radios,
  Switch,
  Switches,
} from "./form.ts";

describe("Button", () => {
  it("emits button[type=button] with no class by default", () => {
    const el = Button(undefined, "Save");

    assert.strictEqual(el.tagName, "BUTTON");
    assert.strictEqual(el.getAttribute("type"), "button");
    assert.strictEqual(el.getAttribute("class"), null);
    assert.match(el.textContent ?? "", /Save/);
  });

  it("applies a sanctioned variant as a class", () => {
    const el = Button("secondary", "Cancel");

    assert.strictEqual(el.getAttribute("type"), "button");
    assert.strictEqual(el.getAttribute("class"), "secondary");
  });
});

describe("Radios", () => {
  it("emits fieldset[role=group] > legend + (input[type=radio] + label[for])*", () => {
    const group = Radios("Size", { small: "Small", large: "Large" });

    assert.strictEqual(group.tagName, "FIELDSET");
    assert.strictEqual(group.getAttribute("role"), "group");
    assert.strictEqual(group.children[0]?.tagName, "LEGEND");
    assert.match(group.children[0]?.textContent ?? "", /Size/);

    const radios = [
      ...group.querySelectorAll("input[type=radio]"),
    ] as HTMLInputElement[];
    assert.strictEqual(radios.length, 2);
    assert.strictEqual(radios[0]?.getAttribute("name"), "size");
    assert.strictEqual(radios[0]?.getAttribute("id"), "size-small");
    assert.strictEqual(radios[0]?.getAttribute("value"), "small");

    const labels = [...group.querySelectorAll("label")];
    assert.strictEqual(labels[0]?.getAttribute("for"), "size-small");
    assert.match(labels[0]?.textContent ?? "", /Small/);
  });
});

describe("Checks", () => {
  it("emits input[type=checkbox] options in a group", () => {
    const group = Checks("Toppings", { cheese: "Cheese" });

    const box = group.querySelector("input");
    assert.strictEqual(box?.getAttribute("type"), "checkbox");
    assert.strictEqual(box?.getAttribute("id"), "toppings-cheese");
    assert.strictEqual(group.getAttribute("role"), "group");
  });
});

describe("Switches", () => {
  it("emits input[type=checkbox][role=switch] options in a group", () => {
    const group = Switches("Notify", { email: "Email" });

    const box = group.querySelector("input");
    assert.strictEqual(box?.getAttribute("type"), "checkbox");
    assert.strictEqual(box?.getAttribute("role"), "switch");
  });
});

describe("single-item controls", () => {
  it("Radio wraps a radio input in its label with the text", () => {
    const el = Radio("Pick me", { id: "opt" });

    assert.strictEqual(el.tagName, "LABEL");
    const box = el.querySelector("input");
    assert.strictEqual(box?.getAttribute("type"), "radio");
    assert.strictEqual(box?.getAttribute("id"), "opt");
    assert.match(el.textContent ?? "", /Pick me/);
  });

  it("Checkbox wraps a checkbox input in its label", () => {
    const el = Checkbox("Agree");

    assert.strictEqual(el.tagName, "LABEL");
    assert.strictEqual(
      el.querySelector("input")?.getAttribute("type"),
      "checkbox",
    );
  });

  it("Switch is a checkbox with role=switch", () => {
    const el = Switch("Dark mode");

    const box = el.querySelector("input");
    assert.strictEqual(box?.getAttribute("type"), "checkbox");
    assert.strictEqual(box?.getAttribute("role"), "switch");
  });
});
