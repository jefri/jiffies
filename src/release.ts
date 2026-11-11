/**
 * Cut CalVer releases of the npm packages in a repository, for a single package or
 * an npm-workspaces monorepo.
 *
 * For each public package, in order:
 *   1. with `ifChanged`, skip it unless its shipped paths changed since its last tag
 *      (a package with no tag yet is always released),
 *   2. compute the next version ({@link nextVersion}) from its tags and package.json,
 *   3. write the version to its package.json,
 *   4. when `commit` is on, commit it (`chore(release): <version>`),
 *   5. tag it (annotated, `<prefix><version>`), push, and
 *   6. publish it to npm.
 *
 * A package configures itself with a `release` key in its package.json:
 *
 * ```json
 * { "release": { "shipped": ["src", "LICENSE", "README.md"], "commit": true } }
 * ```
 *
 * - `shipped`: paths whose changes warrant a release; default is the package directory.
 * - `commit`: commit the version bump; default `true` for a root package and `false`
 *   for a workspace package. With `false` the bump is still written to package.json for
 *   publishing but is left uncommitted, so the tag marks the commit that was released
 *   and the working tree is dirty afterward. That suits a fresh CI checkout; a second
 *   local run fails the clean-tree check until the change is discarded.
 *
 * Tags are `v<version>` for a root package and `<dir>-v<version>` for a workspace.
 * Publishing authenticates with npm Trusted Publishing in CI (see `npm_trust.ts`).
 */
import { compareVersions, nextVersion } from "./calver.ts";
import type { FileSystem } from "./fs.ts";
import { type Run, type Runner, Sh } from "./sh.ts";

export interface ReleaseConfig {
  shipped?: readonly string[];
  commit?: boolean;
}

export interface ReleasePackage {
  name: string;
  /** Directory relative to the repository root; `.` for the root package. */
  dir: string;
  version: string;
  private: boolean;
  config: ReleaseConfig;
}

/** What the release functions need from their host. */
export interface ReleaseEnv {
  fs: FileSystem;
  /** The repository root, used as the working directory for commands. */
  root: string;
  /** Replace the process runner, for tests. */
  runner?: Runner;
  now?: Date;
  /** Print what would happen; change nothing. */
  dryRun?: boolean;
  /** Skip packages whose shipped paths are unchanged since their last tag. */
  ifChanged?: boolean;
  /** Running in GitHub Actions: skip the npm session check (publishing uses OIDC). */
  inActions?: boolean;
  log?: (message: string) => void;
}

interface PackageJson {
  name: string;
  version?: string;
  private?: boolean;
  workspaces?: string[] | { packages?: string[] };
  release?: ReleaseConfig;
}

const packageJsonPath = (dir: string) =>
  dir === "." ? "package.json" : `${dir}/package.json`;

async function readPackage(
  fs: FileSystem,
  dir: string,
): Promise<ReleasePackage | undefined> {
  let pkg: PackageJson;
  try {
    pkg = JSON.parse(await fs.readFile(packageJsonPath(dir)));
  } catch {
    return undefined;
  }
  return {
    name: pkg.name,
    dir,
    version: pkg.version ?? "0.0.0",
    private: pkg.private === true,
    config: pkg.release ?? {},
  };
}

/**
 * The packages to release: the workspaces of the root package.json (a literal
 * directory, or `dir/*` for each child), else the root package itself. Private
 * packages are returned with `private: true`; releasing skips them.
 */
export async function discoverPackages(
  fs: FileSystem,
): Promise<ReleasePackage[]> {
  const root = JSON.parse(await fs.readFile("package.json")) as PackageJson;
  const workspaces = Array.isArray(root.workspaces)
    ? root.workspaces
    : root.workspaces?.packages;
  if (!workspaces) {
    const pkg = await readPackage(fs, ".");
    return pkg ? [pkg] : [];
  }
  const dirs: string[] = [];
  for (const pattern of workspaces) {
    if (pattern.endsWith("/*")) {
      const base = pattern.slice(0, -2);
      const children = await fs.readdir(base).catch(() => []);
      dirs.push(...children.sort().map((child) => `${base}/${child}`));
    } else {
      dirs.push(pattern);
    }
  }
  const found = await Promise.all(dirs.map((dir) => readPackage(fs, dir)));
  return found.filter((pkg) => pkg !== undefined);
}

/** `v` for the root package; `<dir>-v` for a workspace, with each `/` in `dir` written as `-`. */
export function tagPrefix(dir: string): string {
  return dir === "." ? "v" : `${dir.replaceAll("/", "-")}-v`;
}

function shells(env: ReleaseEnv) {
  const base = { cwd: env.root, ...(env.runner ? { runner: env.runner } : {}) };
  return {
    git: Sh("git", base),
    npm: Sh("npm", base),
    live: {
      git: Sh("git", { ...base, capture: false }),
      npm: Sh("npm", { ...base, capture: false }),
    },
  };
}

/** The released versions of a package, from its tags, oldest first. */
async function taggedVersions(
  git: ReturnType<typeof shells>["git"],
  prefix: string,
): Promise<string[]> {
  const tags = (await git.tag("--list", `${prefix}*`)).split("\n");
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.slice(prefix.length))
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version))
    .sort(compareVersions);
}

/** Print and run a command, or just print it in a dry run. */
async function step(
  run: Run,
  env: ReleaseEnv,
  log: (message: string) => void,
): Promise<void> {
  if (env.dryRun) {
    log(`[dry-run] ${run.command}`);
    return;
  }
  log(`> ${run.command}`);
  await run.completed;
}

/**
 * Cut releases for every public package in the repository. Returns the release tags,
 * which is empty when nothing needed releasing. In a dry run they are the tags that
 * would be created.
 */
export async function release(env: ReleaseEnv): Promise<string[]> {
  const log = env.log ?? console.log;
  const now = env.now ?? new Date();
  const { git, npm, live } = shells(env);
  const packages = (await discoverPackages(env.fs)).filter(
    (pkg) => !pkg.private,
  );

  // Preflight: a release is cut from a clean tree and, outside Actions, a logged-in
  // npm session. A live run aborts if either is unmet; a dry run only warns.
  const complain = (message: string) => {
    if (!env.dryRun) throw new Error(message);
    console.warn(`[dry-run] WARNING: ${message}`);
  };
  const dirty = (await git.status("--porcelain")).trim();
  if (dirty) complain(`working tree is not clean:\n${dirty}`);
  if (!env.inActions) {
    const whoami = await npm.whoami().with({ check: false }).completed;
    if (whoami.returncode === 0) {
      log(`npm: authenticated as ${whoami.stdout.trim()}`);
    } else {
      complain("not authenticated to npm; run `npm login` before publishing");
    }
  }

  const tags: string[] = [];
  for (const pkg of packages) {
    const prefix = tagPrefix(pkg.dir);
    const versions = await taggedVersions(git, prefix);
    const last = versions.at(-1);
    if (env.ifChanged && last) {
      const shipped = pkg.config.shipped ?? [pkg.dir];
      const changes = await git.log(
        "--oneline",
        `${prefix}${last}..HEAD`,
        "--",
        ...shipped,
      );
      if (!changes.trim()) {
        log(`${pkg.name}: no shipped changes since ${prefix}${last}`);
        continue;
      }
    }

    const version = nextVersion([...versions, pkg.version], now);
    const tag = `${prefix}${version}`;
    log(
      `${pkg.name}: ${pkg.version} -> ${version}${env.dryRun ? "  (dry run)" : ""}`,
    );

    if (env.dryRun) {
      log(`[dry-run] write ${packageJsonPath(pkg.dir)} version = ${version}`);
    } else {
      const path = packageJsonPath(pkg.dir);
      const json = JSON.parse(await env.fs.readFile(path)) as PackageJson;
      json.version = version;
      await env.fs.writeFile(path, `${JSON.stringify(json, null, 2)}\n`);
    }
    if (pkg.config.commit ?? pkg.dir === ".") {
      await step(live.git.add(packageJsonPath(pkg.dir)), env, log);
      await step(live.git.commit("-m", `chore(release): ${version}`), env, log);
    }
    await step(live.git.tag("-a", tag, "-m", `Release ${version}`), env, log);
    await step(live.git.push("origin", "HEAD", "--follow-tags"), env, log);

    const scope = pkg.dir === "." ? {} : { workspace: pkg.name };
    const publish = live.npm.publish({
      ...scope,
      access: "public",
      ...(env.dryRun ? { dry_run: true } : {}),
    });
    log(`${env.dryRun ? "[dry-run] " : "> "}${publish.command}`);
    // npm's own --dry-run validates the tarball; tolerate its failure in a preview.
    await (env.dryRun ? publish.with({ check: false }) : publish).completed;
    tags.push(tag);
  }
  return tags;
}
