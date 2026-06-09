import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prettyLogFormatter } from "./log.ts";

// Feature test for: prettyLogFormatter for the jiffies server logger.
//
// User story (see docs/developer/2026-06-09-A-log-formatter/feature-test.md):
// As a developer running the jiffies dev server in my terminal, the log output
// is compact and human-shaped instead of JSON noise; and when I pipe the output
// to a file, it stays the original JSON so my tooling still parses it.
//
// Determinism: color is disabled and the clock is injected. The short clock
// `HH:MM:SS.mmm` is derived from the UTC ISO timestamp (slice of the ISO
// string), never from local-time formatting, so the assertions are stable
// regardless of the test runner's timezone. The expected strings match the
// ASCII (color:false) examples in design.md §Specification.

// Shared meta present on every record the default logger produces.
const META = {
  name: "default",
  prefix: "INFO",
  level: 2,
  source: "info (file://.../log.ts:143:28)",
} as const;

describe("prettyLogFormatter feature", () => {
  it("renders compact human lines on a TTY yet stays JSON when piped", () => {
    // Arrange: a TTY formatter, color off, clock pinned to a fixed UTC instant.
    const pretty = prettyLogFormatter({
      tty: true,
      color: false,
      now: () => new Date("2026-06-09T18:18:23.140Z"),
    });

    // Act: format the generic "Server listening" record.
    const listening = pretty({
      ...META,
      message: "Server listening",
      address: "http://127.0.0.1:8080",
    });

    // Assert: the generic human shape from design.md, color stripped.
    assert.strictEqual(
      listening,
      "ℹ 18:18:23.140 Server listening address=http://127.0.0.1:8080",
    );
    // And the four noise fields are gone from the human view.
    assert.doesNotMatch(listening, /name/);
    assert.doesNotMatch(listening, /prefix/);
    assert.doesNotMatch(listening, /level/);
    assert.doesNotMatch(listening, /source/);

    // Act: format the access-log "Request" record. The short clock for this
    // shape comes from the `when` ISO (sliced UTC time-of-day), not now().
    const request = pretty({
      ...META,
      message: "Request",
      when: "2026-06-09T18:18:23.142Z",
      who: "127.0.0.1",
      how: "GET /trips/hvar",
    });

    // Assert: the access-log shape from design.md, color stripped — method,
    // path, and dim client present; no JSON braces; no dropped-field names.
    assert.strictEqual(request, "ℹ 18:18:23.142 GET /trips/hvar 127.0.0.1");
    assert.doesNotMatch(request, /[{}]/);
    assert.doesNotMatch(request, /name|prefix|level|source/);

    // Arrange: a non-TTY formatter (the piped/redirected destination).
    const piped = prettyLogFormatter({ tty: false });

    // Act: format the same "Server listening" record down the piped path.
    const jsonLine = piped({
      ...META,
      message: "Server listening",
      address: "http://127.0.0.1:8080",
    });

    // Assert: the piped path is unchanged JSON that round-trips for tooling.
    const parsed = JSON.parse(jsonLine) as {
      message: string;
      address: string;
    };
    assert.strictEqual(parsed.message, "Server listening");
    assert.strictEqual(parsed.address, "http://127.0.0.1:8080");
  });
});
