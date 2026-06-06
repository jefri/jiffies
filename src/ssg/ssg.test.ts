import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FC } from "../dom/fc.ts";
import { div, h1, p } from "../dom/html.ts";
import { FileSystem, RecordFileSystemAdapter } from "../fs.ts";
import { build, type PageModule } from "./ssg.ts";

function makeFS(): { fs: FileSystem; files: Record<string, string> } {
  const files: Record<string, string> = {};
  return { files, fs: new FileSystem(new RecordFileSystemAdapter(files)) };
}

// A leaf FC whose props are echoed into its rendered subtree for assertions.
const Item = FC<{ label: string }>("ssg-item", (_el, attrs) =>
  div(attrs.label ?? ""),
);
void Item;

// An outer FC that renders Item as a child — used to test defer-hydration.
const Container = FC<object>("ssg-container", (_el) =>
  Item({ label: "nested" }),
);
void Container;

describe("ssg/build — route to file path", () => {
  it("writes index.html for the root route '/'", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [{ route: "/", module: { default: () => h1("Home") } }],
      out: "/out",
      fs,
    });
    assert.ok(files["/out/index.html"], "index.html was written");
    assert.ok(
      files["/out/index.html"].includes("<h1>Home</h1>"),
      "body content present",
    );
  });

  it("writes <route>/index.html for a nested route", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [{ route: "/about", module: { default: () => p("About") } }],
      out: "/out",
      fs,
    });
    assert.ok(files["/out/about/index.html"], "nested route written");
  });

  it("produces a complete HTML document", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [{ route: "/", module: { default: () => p("content") } }],
      out: "/out",
      fs,
    });
    const html = files["/out/index.html"] ?? "";
    assert.ok(html.startsWith("<!doctype html>"), "starts with doctype");
    assert.ok(html.includes('<html lang="en">'), "html element with lang");
    assert.ok(html.includes("<head>"), "head element present");
    assert.ok(html.includes("<body>"), "body element present");
  });

  it("applies htmlAttributes to the <html> element", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [
        {
          route: "/",
          module: {
            default: () => p("content"),
            htmlAttributes: {
              "data-theme": "dark",
              "data-color-scheme": "auto",
            },
          },
        },
      ],
      out: "/out",
      fs,
    });
    const html = files["/out/index.html"] ?? "";
    assert.ok(html.includes('data-theme="dark"'), "data-theme on <html>");
    assert.ok(
      html.includes('data-color-scheme="auto"'),
      "data-color-scheme on <html>",
    );
  });

  it("uses the page module lang override", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [
        {
          route: "/",
          module: { default: () => p("hola"), htmlAttributes: { lang: "es" } },
        },
      ],
      out: "/out",
      fs,
    });
    assert.ok(
      files["/out/index.html"]?.includes('lang="es"'),
      "lang attribute overridden",
    );
  });

  it("renders head nodes inside <head>", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [
        {
          route: "/",
          module: {
            default: () => p("body"),
            head: () => h1("title node"),
          },
        },
      ],
      out: "/out",
      fs,
    });
    const html = files["/out/index.html"] ?? "";
    assert.ok(
      html.includes("<head><h1>title node</h1></head>"),
      "head node in <head>",
    );
  });
});

describe("ssg/build — hydration payload", () => {
  it("injects __hydration script when FC units have props", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [
        { route: "/", module: { default: () => Item({ label: "Hello M5" }) } },
      ],
      out: "/out",
      fs,
    });
    const html = files["/out/index.html"] ?? "";
    assert.ok(html.includes('id="__hydration"'), "__hydration script present");
    assert.ok(html.includes('"label"'), "prop key in payload");
    assert.ok(html.includes('"Hello M5"'), "prop value in payload");
  });

  it("does not inject __hydration script for fully static pages", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [{ route: "/", module: { default: () => p("static") } }],
      out: "/out",
      fs,
    });
    assert.ok(
      !(files["/out/index.html"] ?? "").includes('id="__hydration"'),
      "no __hydration script for static page",
    );
  });
});

describe("ssg/build — defer-hydration for nested custom elements", () => {
  it("adds defer-hydration to the nested inner FC", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [{ route: "/", module: { default: () => Container({}) } }],
      out: "/out",
      fs,
    });
    assert.ok(
      (files["/out/index.html"] ?? "").includes("defer-hydration"),
      "nested FC carries defer-hydration",
    );
  });

  it("does not add defer-hydration to the top-level outer FC", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [{ route: "/", module: { default: () => Container({}) } }],
      out: "/out",
      fs,
    });
    const html = files["/out/index.html"] ?? "";
    const outerTag = html.match(/<ssg-container([^>]*)>/);
    assert.ok(outerTag, "outer FC element present in output");
    assert.ok(
      !outerTag[1].includes("defer-hydration"),
      "outer top-level FC does not carry defer-hydration",
    );
  });
});

describe("ssg/build — capture stub injection", () => {
  it("injects capture stub when the page has FC units", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [{ route: "/", module: { default: () => Item({ label: "x" }) } }],
      out: "/out",
      fs,
    });
    assert.ok(
      (files["/out/index.html"] ?? "").includes("__hydrateQueue"),
      "capture stub references __hydrateQueue",
    );
  });

  it("injects capture stub when clientModules is set on a static page", async () => {
    const { fs, files } = makeFS();
    const page: PageModule = {
      default: () => p("static"),
      clientModules: ["/app/client.js"],
    };
    await build({ pages: [{ route: "/", module: page }], out: "/out", fs });
    assert.ok(
      (files["/out/index.html"] ?? "").includes("__hydrateQueue"),
      "capture stub present when clientModules is set",
    );
  });

  it("omits capture stub for fully static pages without clientModules", async () => {
    const { fs, files } = makeFS();
    await build({
      pages: [{ route: "/", module: { default: () => p("static") } }],
      out: "/out",
      fs,
    });
    assert.ok(
      !(files["/out/index.html"] ?? "").includes("__hydrateQueue"),
      "no capture stub for fully static page",
    );
  });
});

describe("ssg/build — client module script", () => {
  it("injects a deferred module script when clientModules is set", async () => {
    const { fs, files } = makeFS();
    const clientEntry = "/app/client.js";
    const page: PageModule = {
      default: () => p("content"),
      clientModules: [clientEntry],
    };
    await build({ pages: [{ route: "/", module: page }], out: "/out", fs });
    const html = files["/out/index.html"] ?? "";
    assert.ok(html.includes('type="module"'), "module script tag present");
    assert.ok(html.includes(clientEntry), "client entry path in script");
  });

  it("includes all listed modules in the script", async () => {
    const { fs, files } = makeFS();
    const modules = ["/app/a.js", "/app/b.js"];
    const page: PageModule = {
      default: () => p("content"),
      clientModules: modules,
    };
    await build({ pages: [{ route: "/", module: page }], out: "/out", fs });
    const html = files["/out/index.html"] ?? "";
    for (const m of modules) {
      assert.ok(html.includes(m), `${m} present in module script`);
    }
  });
});
