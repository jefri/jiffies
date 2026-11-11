// One-time setup for tokenless releases: npm Trusted Publishing from release.yml.
// Trusts this repo's release.yml to publish the package, then triggers a release.
// Requires an interactive `npm login` session with 2FA (passkey); bypass-2FA tokens
// are not accepted by `npm trust`. Needs npm 11.15 or newer.
// Usage: npm run setup-npm-trust
import { fileURLToPath } from "node:url";
import { NodeFileSystem } from "../src/fs_node.ts";
import { Sh } from "../src/sh.ts";

export const REPO = "jefri/jiffies";
export const WORKFLOW = "release.yml";

export function trustArgs(name: string): string[] {
  return [
    "trust",
    "github",
    name,
    "--file",
    WORKFLOW,
    "--repo",
    REPO,
    "--allow-publish",
    "--yes",
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const npm = Sh("npm");
  // Prompts (login, 2FA) and progress go straight to the terminal.
  const interactive = {
    npm: Sh("npm", { capture: false }),
    gh: Sh("gh", { capture: false }),
  };

  const fs = new NodeFileSystem(fileURLToPath(new URL("..", import.meta.url)));
  const { name } = JSON.parse(await fs.readFile("package.json")) as {
    name: string;
  };

  if ((await npm.whoami.with({ check: false }).completed).returncode !== 0) {
    await interactive.npm.login("--auth-type=web");
  }
  // npm can only trust a package that already exists.
  if (
    (await npm.view(name, "name").with({ check: false }).completed)
      .returncode !== 0
  ) {
    throw new Error(
      `${name} does not exist on npm yet; publish it once with \`npm run stamp\`.`,
    );
  }

  const trusted = await npm.trust.list(name).with({ check: false });
  if (trusted.includes(WORKFLOW)) {
    console.log(`${name}: already trusts ${WORKFLOW}.`);
  } else {
    await interactive.npm(...trustArgs(name));
  }

  // A new trust config must complete a first publish within 2 days.
  await interactive.gh.workflow.run(WORKFLOW, "--repo", REPO, "--ref", "main");
  console.log("Triggered release.yml; watch it with `gh run watch`.");
}
