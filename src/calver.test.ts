import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareVersions, isoWeek, nextVersion } from "./calver.ts";

describe("calver (YYYY.ISO_WEEK.MICRO)", () => {
  it("computes the ISO 8601 week-numbering year and week", () => {
    assert.deepEqual(isoWeek(new Date(2026, 0, 1)), { year: 2026, week: 1 });
    assert.deepEqual(isoWeek(new Date(2026, 5, 10)), { year: 2026, week: 24 });
    assert.deepEqual(isoWeek(new Date(2026, 10, 11)), { year: 2026, week: 46 });
  });

  it("attributes a week to its Thursday's year at the boundary", () => {
    assert.deepEqual(isoWeek(new Date(2026, 11, 31)), { year: 2026, week: 53 });
    assert.deepEqual(isoWeek(new Date(2027, 0, 1)), { year: 2026, week: 53 });
    assert.deepEqual(isoWeek(new Date(2027, 0, 4)), { year: 2027, week: 1 });
  });

  it("resets MICRO to 0 in a new week", () => {
    assert.equal(nextVersion("2026.4.1", new Date(2026, 5, 10)), "2026.24.0");
  });

  it("increments MICRO within the same week", () => {
    assert.equal(nextVersion("2026.24.0", new Date(2026, 5, 10)), "2026.24.1");
    assert.equal(nextVersion("2026.24.7", new Date(2026, 5, 10)), "2026.24.8");
  });

  it("starts at 0 from a non-CalVer current version", () => {
    assert.equal(nextVersion("0.1.0", new Date(2026, 5, 10)), "2026.24.0");
    assert.equal(nextVersion("0.0.0", new Date(2026, 5, 10)), "2026.24.0");
  });

  it("continues from the highest of many versions, such as tags", () => {
    const tags = ["2026.46.0", "2026.46.2", "2026.45.9", "2026.46.1"];
    assert.equal(nextVersion(tags, new Date(2026, 10, 11)), "2026.46.3");
    assert.equal(nextVersion([], new Date(2026, 10, 11)), "2026.46.0");
    assert.equal(nextVersion(tags, new Date(2026, 10, 18)), "2026.47.0");
  });

  it("orders versions numerically", () => {
    assert.deepEqual(
      ["2026.46.10", "2026.9.0", "2026.46.2"].sort(compareVersions),
      ["2026.9.0", "2026.46.2", "2026.46.10"],
    );
  });
});
