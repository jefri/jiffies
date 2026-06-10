import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isoWeek, nextVersion } from "./stamp.ts";

describe("stamp — CalVer (YYYY.ISO_WEEK.MICRO)", () => {
  it("computes the ISO 8601 week-numbering year and week", () => {
    // 2026-01-01 is a Thursday, so it is week 1 of 2026.
    assert.deepEqual(isoWeek(new Date(2026, 0, 1)), { year: 2026, week: 1 });
    // 2026-06-10 is a Wednesday in week 24.
    assert.deepEqual(isoWeek(new Date(2026, 5, 10)), { year: 2026, week: 24 });
  });

  it("attributes a week to its Thursday's year at the boundary", () => {
    // 2026 begins on a Thursday, so it has 53 ISO weeks. 2026-12-31 (Thursday)
    // and the following day 2027-01-01 (Friday) both belong to week 53 of 2026...
    assert.deepEqual(isoWeek(new Date(2026, 11, 31)), { year: 2026, week: 53 });
    assert.deepEqual(isoWeek(new Date(2027, 0, 1)), { year: 2026, week: 53 });
    // ...while 2027-01-04 (Monday) opens week 1 of the 2027 week-numbering year.
    assert.deepEqual(isoWeek(new Date(2027, 0, 4)), { year: 2027, week: 1 });
  });

  it("resets MICRO to 0 when the release falls in a new week", () => {
    // Current 2026.4.1 names a different week, so MICRO restarts.
    assert.equal(nextVersion("2026.4.1", new Date(2026, 5, 10)), "2026.24.0");
  });

  it("increments MICRO for a second release in the same week", () => {
    assert.equal(nextVersion("2026.24.0", new Date(2026, 5, 10)), "2026.24.1");
    assert.equal(nextVersion("2026.24.7", new Date(2026, 5, 10)), "2026.24.8");
  });

  it("starts MICRO at 0 from a non-CalVer (legacy semver) current version", () => {
    assert.equal(nextVersion("0.1.0", new Date(2026, 5, 10)), "2026.24.0");
    assert.equal(nextVersion("2.3.0", new Date(2026, 5, 10)), "2026.24.0");
  });
});
