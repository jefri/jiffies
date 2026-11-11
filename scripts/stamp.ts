/**
 * stamp — cut a CalVer release of @davidsouther/jiffies.
 *
 * Versioning scheme: `YYYY.ISO_WEEK.MICRO` using the ISO 8601 week-numbering year
 * and week. MICRO increments when more than one release is cut in the same ISO
 * week and resets to 0 in a new week, so the version is monotonic and
 * collision-free without depending on the day of the week.
 *
 * The human cuts a release with `npm run stamp` (CI does not). It:
 *   1. computes the next version from package.json's current version and today,
 *   2. writes it back to package.json,
 *   3. commits (`chore(release): <version>`),
 *   4. tags (`v<version>`, annotated, matching the existing v-prefixed tags),
 *   5. pushes the current branch and the tag to origin, and
 *   6. publishes the package to npm.
 *
 * Pass `--if-changed` to do nothing unless `src`, `LICENSE`, or `README.md`
 * changed since the latest `v*` tag; the nightly `release.yml` workflow uses it.
 * In GitHub Actions the npm session check is skipped, because publishing
 * authenticates with npm Trusted Publishing (OIDC) rather than a login.
 *
 * Pass `--dry-run` to preview every step without mutating package.json,
 * committing, tagging, pushing, or publishing. The publish step is exercised via
 * `npm publish --dry-run`, which validates the tarball contents without uploading.
 *
 * Preconditions for a live run, checked up front: a clean working tree and an
 * authenticated npm session (`npm whoami`). Either being unmet aborts a live run;
 * in a dry run they are reported as warnings.
 */
import { fileURLToPath } from "node:url";
import { NodeFileSystem } from "../src/fs_node.ts";
import { git, type Run, Sh } from "../src/sh.ts";

const ROOT = new URL("..", import.meta.url);
const PACKAGE_JSON = "package.json";
/** Paths whose changes warrant a release. A version bump touches only package.json. */
const SHIPPED = ["src", "LICENSE", "README.md"];
/** Commands whose output streams to this process. */
const live = {
  git: Sh("git", { capture: false, cwd: ROOT }),
  npm: Sh("npm", { capture: false, cwd: ROOT }),
};
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
 * The next CalVer version after `current`, for a release cut on `date`. MICRO
 * continues from `current` only when `current` already names this same ISO
 * `year.week`; otherwise (a new week, or a non-CalVer value like an old semver
 * `0.1.0`) it restarts at 0.
 */
export function nextVersion(current: string, date: Date): string {
  const { year, week } = isoWeek(date);
  const prefix = `${year}.${week}`;
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
  const micro =
    match && `${match[1]}.${match[2]}` === prefix ? Number(match[3]) + 1 : 0;
  return `${prefix}.${micro}`;
}

/** Print and run a command, or just print it when `dryRun` is set. */
async function step(run: Run, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] ${run.command}`);
    return;
  }
  console.log(`> ${run.command}`);
  await run.completed;
}

/** Whether shipped files changed since the latest release tag (true when untagged). */
async function changedSinceLastRelease(): Promise<boolean> {
  const repo = git.$({ C: fileURLToPath(ROOT) });
  const described = await repo
    .describe("--tags", "--abbrev=0", "--match", "v*")
    .with({ check: false }).completed;
  if (described.returncode !== 0) return true;
  const tag = described.stdout.trim();
  return Boolean(await repo.log("--oneline", `${tag}..HEAD`, "--", ...SHIPPED));
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const ifChanged = process.argv.includes("--if-changed");
  const inActions = process.env.GITHUB_ACTIONS === "true";
  const fs = new NodeFileSystem(fileURLToPath(ROOT));

  if (ifChanged && !(await changedSinceLastRelease())) {
    console.log("stamp: no shipped changes since the last release tag");
    return;
  }

  const pkg = JSON.parse(await fs.readFile(PACKAGE_JSON));
  const current: string = pkg.version;
  const version = nextVersion(current, new Date());
  const tag = `v${version}`;

  console.log(
    `stamp: ${pkg.name} ${current} -> ${version}${dryRun ? "  (dry run)" : ""}`,
  );

  // Preflight: a release must be cut from a clean tree and, outside Actions, an
  // authenticated npm session. A live run aborts if either is unmet; a dry run
  // only warns.
  const complain = (message: string) => {
    if (!dryRun) throw new Error(message);
    console.warn(`[dry-run] WARNING: ${message}`);
  };

  const dirty = (
    await git.$({ C: fileURLToPath(ROOT) }).status("--porcelain")
  ).trim();
  if (dirty) complain(`working tree is not clean:\n${dirty}`);

  if (!inActions) {
    const whoami = await Sh("npm", { cwd: ROOT }).whoami.with({ check: false })
      .completed;
    if (whoami.returncode === 0) {
      console.log(`npm: authenticated as ${whoami.stdout.trim()}`);
    } else {
      complain("not authenticated to npm; run `npm login` before publishing");
    }
  }

  // 1. Write the new version. JSON.stringify with 2-space indent + trailing
  // newline reproduces the file's existing shape, so the diff is the version line
  // alone.
  if (dryRun) {
    console.log(`[dry-run] write package.json version = ${version}`);
  } else {
    pkg.version = version;
    await fs.writeFile(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`wrote package.json version = ${version}`);
  }

  // 2. commit, 3. tag, 4. push branch + the annotated tag.
  await step(live.git.add("package.json"), dryRun);
  await step(live.git.commit("-m", `chore(release): ${version}`), dryRun);
  await step(live.git.tag("-a", tag, "-m", `Release ${version}`), dryRun);
  await step(live.git.push("origin", "HEAD", "--follow-tags"), dryRun);

  // 5. publish. In a dry run, npm's own --dry-run validates the tarball without
  // uploading; tolerate its failure (e.g. when not logged in) so the preview
  // still completes.
  if (dryRun) {
    const publish = live.npm.publish("--access", "public", "--dry-run");
    console.log(`[dry-run] ${publish.command}`);
    await publish.with({ check: false }).completed;
  } else {
    await step(live.npm.publish("--access", "public"), false);
  }

  console.log(
    dryRun
      ? "dry run complete; nothing was changed, pushed, or published"
      : `published ${pkg.name}@${version}`,
  );
}

// Run only when invoked directly (`node scripts/stamp.ts`), not when the test
// imports the pure functions above.
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
