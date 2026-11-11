/**
 * One-time setup for tokenless releases: npm Trusted Publishing from a GitHub
 * Actions workflow. For each public package it publishes a placeholder if the
 * package does not exist yet (npm can only trust an existing package), trusts the
 * workflow to publish it, then triggers the workflow, because a new trust
 * configuration expires unless it completes a first publish within 2 days.
 *
 * Needs an interactive npm session with 2FA (passkey) and npm 11.15 or newer;
 * bypass-2FA tokens are not accepted by `npm trust`. Prompts go straight to the
 * terminal. Each package's `repository` field must match the GitHub repository
 * exactly, or publishing fails with `ENEEDAUTH`.
 */
import { discoverPackages, type ReleaseEnv } from "./release.ts";
import { Sh } from "./sh.ts";

export const DEFAULT_WORKFLOW = "release.yml";

export interface TrustEnv
  extends Pick<ReleaseEnv, "fs" | "root" | "runner" | "log"> {
  /** Workflow file under `.github/workflows`. Default `release.yml`. */
  workflow?: string;
  /** Branch to trigger the workflow on. Default `main`. */
  ref?: string;
  /** `owner/repo`. Default is read from the `origin` remote. */
  repo?: string;
}

/** The arguments to `npm` that trust `workflow` of `repo` to publish `name` directly. */
export function trustArgs(
  name: string,
  repo: string,
  workflow: string,
): string[] {
  return [
    "trust",
    "github",
    name,
    "--file",
    workflow,
    "--repo",
    repo,
    "--allow-publish",
    "--yes",
  ];
}

/** `owner/repo` from a GitHub https, ssh, or `ssh://` remote URL. */
export function repoFromRemote(remote: string): string {
  const match = remote
    .trim()
    .match(/github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?$/);
  if (!match?.[1]) throw new Error(`Not a GitHub remote: ${remote.trim()}`);
  return match[1];
}

export async function setupTrust(env: TrustEnv): Promise<void> {
  const log = env.log ?? console.log;
  const workflow = env.workflow ?? DEFAULT_WORKFLOW;
  const base = { cwd: env.root, ...(env.runner ? { runner: env.runner } : {}) };
  const git = Sh("git", base);
  const npm = Sh("npm", base);
  // Prompts (login, 2FA) and progress go straight to the terminal.
  const live = {
    npm: Sh("npm", { ...base, capture: false }),
    gh: Sh("gh", { ...base, capture: false }),
  };

  const repo =
    env.repo ?? repoFromRemote(await git.remote["get-url"]("origin"));
  const packages = (await discoverPackages(env.fs)).filter(
    (pkg) => !pkg.private,
  );

  if ((await npm.whoami().with({ check: false }).completed).returncode !== 0) {
    await live.npm.login({ auth_type: "web" });
  }
  for (const pkg of packages) {
    const scope = pkg.dir === "." ? {} : { workspace: pkg.name };
    const exists =
      (await npm.view(pkg.name, "name").with({ check: false }).completed)
        .returncode === 0;
    if (!exists) {
      log(`${pkg.name} does not exist yet; publishing a placeholder.`);
      await live.npm.publish({ ...scope, access: "public" });
    }
    const trusted = await npm.trust.list(pkg.name).with({ check: false });
    if (trusted.includes(workflow)) {
      log(`${pkg.name}: already trusts ${workflow}.`);
    } else {
      await live.npm(...trustArgs(pkg.name, repo, workflow));
    }
  }

  await live.gh.workflow.run(workflow, { repo, ref: env.ref ?? "main" });
  log(`Triggered ${workflow}; watch it with \`gh run watch\`.`);
}
