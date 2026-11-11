/**
 * CalVer `YYYY.ISO_WEEK.MICRO`. MICRO counts releases within the week, starting at 0.
 * {@link nextVersion} continues MICRO from existing candidate versions. The result
 * does not depend on the day of the week.
 */

const MS_PER_DAY = 86_400_000;

/**
 * The ISO 8601 week-numbering year and week of `date`. Computed in UTC off the
 * local calendar date so timezone and DST never shift the result.
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
 * continues from the highest `existing` version with the given ISO year and week;
 * otherwise for a new week it restarts at 0.
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
