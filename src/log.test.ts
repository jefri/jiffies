import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prettyLogFormatter } from "./log.ts";

// Unit coverage for prettyLogFormatter beyond the single feature test: the
// color escape path, the access shape with status present vs absent, and the
// severity glyphs. Clocks are pinned to a UTC ISO and sliced (never local
// time) so every assertion is timezone-stable. See design.md §Testability.

const META = {
  name: "default",
  prefix: "INFO",
  level: 2,
  source: "info (file://.../log.ts:143:28)",
} as const;

const AT = () => new Date("2026-06-09T18:18:23.140Z");

describe("prettyLogFormatter", () => {
  it("emits ANSI color escapes when color is enabled", () => {
    const fmt = prettyLogFormatter({ tty: true, color: true, now: AT });
    const out = fmt({ ...META, message: "Server listening", address: "x" });
    // INFO glyph is green; the line carries the green escape and a reset.
    // Assert via includes() rather than regex so the ESC control char stays
    // out of a regex literal (biome lint/suspicious/noControlCharactersInRegex).
    assert.ok(out.includes("\x1b[32m"));
    assert.ok(out.includes("\x1b[0m"));
    // Bold is applied to the message.
    assert.ok(out.includes("\x1b[1mServer listening\x1b[0m"));
  });

  it("renders the access status, colored by class, when present", () => {
    const fmt = prettyLogFormatter({ tty: true, color: false, now: AT });
    const out = fmt({
      ...META,
      message: "Request",
      when: "2026-06-09T18:18:23.142Z",
      who: "127.0.0.1",
      how: "GET /trips/hvar",
      status: 200,
      ms: 3,
    });
    assert.strictEqual(out, "ℹ 18:18:23.142 GET /trips/hvar 127.0.0.1 200 3ms");
  });

  it("colors a 5xx status red", () => {
    const fmt = prettyLogFormatter({ tty: true, color: true, now: AT });
    const out = fmt({
      ...META,
      message: "Request",
      when: "2026-06-09T18:18:23.142Z",
      who: "127.0.0.1",
      how: "GET /boom",
      status: 500,
    });
    assert.ok(out.includes("\x1b[31m500\x1b[0m"));
  });

  it("omits the status segment and any trailing space when absent", () => {
    const fmt = prettyLogFormatter({ tty: true, color: false, now: AT });
    const out = fmt({
      ...META,
      message: "Request",
      when: "2026-06-09T18:18:23.142Z",
      who: "127.0.0.1",
      how: "GET /trips/hvar",
    });
    assert.strictEqual(out, "ℹ 18:18:23.142 GET /trips/hvar 127.0.0.1");
    assert.doesNotMatch(out, / $/);
  });

  it("uses a glyph per severity and drops the noise fields", () => {
    const warn = prettyLogFormatter({ tty: true, color: false, now: AT })({
      ...META,
      prefix: "WARN",
      level: 3,
      message: "slow build",
    });
    assert.strictEqual(warn, "⚠ 18:18:23.140 slow build");

    const err = prettyLogFormatter({ tty: true, color: false, now: AT })({
      ...META,
      prefix: "ERR",
      level: 4,
      message: "boom",
    });
    assert.strictEqual(err, "✖ 18:18:23.140 boom");
  });

  it("renders unknown data fields as a dim key=value tail", () => {
    const fmt = prettyLogFormatter({ tty: true, color: false, now: AT });
    const out = fmt({
      ...META,
      message: "Adding to sitemap",
      index: "/index.html",
    });
    assert.strictEqual(
      out,
      "ℹ 18:18:23.140 Adding to sitemap index=/index.html",
    );
  });

  it("falls back to JSON when not a TTY", () => {
    const fmt = prettyLogFormatter({ tty: false });
    const out = fmt({ ...META, message: "Server listening", address: "y" });
    assert.deepStrictEqual(JSON.parse(out), {
      ...META,
      message: "Server listening",
      address: "y",
    });
  });
});
