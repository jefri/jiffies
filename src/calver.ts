/**
 * CalVer `YYYY.ISO_WEEK.MICRO`, using the ISO 8601 week-numbering year and week.
 * MICRO counts releases within the week, starting at 0, so versions are monotonic
 * and collision-free without depending on the day of the week.
 */

const MS_PER_DAY = 86_400_000;

/**
 * The ISO 8601 week-numbering year and week of `date`. The week-numbering year is
 * the year that owns the week's Thursday, which is why it can differ from the
 * calendar year at the boundaries: 2026 starts on a Thursday, so 2026-12-31
 * (Thursday) and 2027-01-01 (Friday) are both week 53 of 2026, while 2027-01-04
 * (Monday) opens week 1 of 2027. Computed in UTC off the local calendar date so a
 * machine's timezone and DST never shift the result.
 */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const weekday = d.getUTCDay() || 7; // Mon=1..Sun=7 (getUTCDay puts Sunday at 0)
  d.setUTCDate(d.getUTCDate() + 4 - weekday); // step to this week's Thursday
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7,
  );
  return { year, week };
}

/**
 * The next CalVer version after `existing`, for a release cut on `date`. MICRO
 * continues from the highest `existing` version that already names this same ISO
 * `year.week`; otherwise (a new week, or only non-CalVer values like an old semver
 * `0.1.0`) it restarts at 0. `existing` is one version, or every known version,
 * such as release tags.
 */
export function nextVersion(
  existing: string | readonly string[],
  date: Date,
): string {
  const { year, week } = isoWeek(date);
  const prefix = `${year}.${week}`;
  const micros = [existing]
    .flat()
    .map((version) => version.match(/^(\d+)\.(\d+)\.(\d+)$/))
    .filter((match) => match && `${match[1]}.${match[2]}` === prefix)
    .map((match) => Number(match?.[3]));
  return `${prefix}.${micros.length ? Math.max(...micros) + 1 : 0}`;
}

/** Order versions numerically by segment, oldest first. */
export function compareVersions(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}
