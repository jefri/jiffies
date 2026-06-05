import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FileSystem, RecordFileSystemAdapter } from "../fs.ts";
import { FC } from "./fc.ts";
import { br, div, h1, input, meta, p, title } from "./html.ts";
import { circle, svg } from "./svg.ts";
import { renderDocument, renderToString } from "./render.ts";
import { build } from "./ssg.ts";

const Greeting = FC<{ name: string }>(
  "x-offline-greeting",
  (_el, attrs) => p(`Hello, ${attrs.name}!`),
);

// --- renderToString ---

describe("renderToString", () => {
  it("serializes a plain element", () => {
    assert.equal(renderToString(div(p("hello"))), "<div><p>hello</p></div>");
  });

  it("serializes a void element with no closing tag", () => {
    assert.equal(renderToString(br()), "<br>");
  });

  it("serializes a void input with attributes", () => {
    assert.equal(
      renderToString(input({ type: "text", name: "q" })),
      '<input type="text" name="q">',
    );
  });

  it("escapes special characters in text content", () => {
    assert.equal(
      renderToString(p("A & B < C")),
      "<p>A &amp; B &lt; C</p>",
    );
  });

  it("escapes double-quotes in attribute values", () => {
    assert.equal(
      renderToString(div({ title: 'Say "hi"' })),
      '<div title="Say &quot;hi&quot;"></div>',
    );
  });

  it("serializes an SVG element", () => {
    assert.equal(
      renderToString(svg(circle({ cx: "50", cy: "50", r: "40" }))),
      '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"></circle></svg>',
    );
  });

  it("serializes an FC custom element including its rendered children", () => {
    assert.equal(
      renderToString(Greeting({ name: "World" })),
      '<x-offline-greeting name="World"><p>Hello, World!</p></x-offline-greeting>',
    );
  });

  it("serializes an Element[] by concatenation", () => {
    assert.equal(
      renderToString([p("first"), p("second")]),
      "<p>first</p><p>second</p>",
    );
  });

  it("omits event listeners from output", () => {
    assert.equal(
      renderToString(div({ events: { click: () => {} } })),
      "<div></div>",
    );
  });
});

// --- renderDocument ---

describe("renderDocument", () => {
  it("produces a full HTML document string with doctype", () => {
    assert.equal(
      renderDocument({ body: p("content") }),
      '<!doctype html><html lang="en"><head></head><body><p>content</p></body></html>',
    );
  });

  it("places head nodes inside <head> before <body>", () => {
    assert.equal(
      renderDocument({
        body: p("body"),
        head: [title("My Page"), meta({ name: "description", content: "test" })],
      }),
      '<!doctype html><html lang="en"><head><title>My Page</title><meta name="description" content="test"></head><body><p>body</p></body></html>',
    );
  });

  it("respects a custom lang attribute", () => {
    assert.equal(
      renderDocument({ body: p("hola"), lang: "es" }),
      '<!doctype html><html lang="es"><head></head><body><p>hola</p></body></html>',
    );
  });
});

// --- build (SSG) ---

describe("build", () => {
  it("writes index.html for a root page", async () => {
    const store: Record<string, string> = {};
    const fs = new FileSystem(new RecordFileSystemAdapter(store));

    await build({
      pages: [{ route: "/", module: { default: () => h1("Home") } }],
      out: "/out",
      fs,
    });

    assert.equal(
      store["/out/index.html"],
      '<!doctype html><html lang="en"><head></head><body><h1>Home</h1></body></html>',
    );
  });

  it("writes <route>/index.html for a nested page", async () => {
    const store: Record<string, string> = {};
    const fs = new FileSystem(new RecordFileSystemAdapter(store));

    await build({
      pages: [{ route: "/about", module: { default: () => p("About") } }],
      out: "/out",
      fs,
    });

    assert.equal(
      store["/out/about/index.html"],
      '<!doctype html><html lang="en"><head></head><body><p>About</p></body></html>',
    );
  });

  it("supports an async default export", async () => {
    const store: Record<string, string> = {};
    const fs = new FileSystem(new RecordFileSystemAdapter(store));

    await build({
      pages: [{ route: "/", module: { default: async () => p("lazy") } }],
      out: "/out",
      fs,
    });

    assert.equal(
      store["/out/index.html"],
      '<!doctype html><html lang="en"><head></head><body><p>lazy</p></body></html>',
    );
  });

  it("uses the page module's lang override", async () => {
    const store: Record<string, string> = {};
    const fs = new FileSystem(new RecordFileSystemAdapter(store));

    await build({
      pages: [{ route: "/about", module: { default: () => p("À propos"), lang: "fr" } }],
      out: "/out",
      fs,
    });

    assert.equal(
      store["/out/about/index.html"],
      '<!doctype html><html lang="fr"><head></head><body><p>À propos</p></body></html>',
    );
  });

  it("renders head from an async head export", async () => {
    const store: Record<string, string> = {};
    const fs = new FileSystem(new RecordFileSystemAdapter(store));

    await build({
      pages: [{
        route: "/",
        module: {
          default: () => p("hello"),
          head: async () => title("Hello Page"),
        },
      }],
      out: "/out",
      fs,
    });

    assert.equal(
      store["/out/index.html"],
      '<!doctype html><html lang="en"><head><title>Hello Page</title></head><body><p>hello</p></body></html>',
    );
  });
});
