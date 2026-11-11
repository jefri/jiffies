import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FileSystem, ObjectFileSystemAdapter } from "./fs.ts";
import {
  repoFromRemote,
  setupTrust,
  trustArgs,
  trustsWorkflow,
} from "./npm_trust.ts";
import { makeRunner, type Output } from "./sh.ts";

function machine(answers: Record<string, Output> = {}) {
  const calls: string[] = [];
  const runner = makeRunner((args) => {
    const line = args.join(" ");
    calls.push(line);
    for (const [prefix, output] of Object.entries(answers)) {
      if (line.startsWith(prefix)) return output;
    }
    return { stdout: "" };
  });
  return { calls, runner };
}

const fs = () =>
  new FileSystem(
    new ObjectFileSystemAdapter({
      "package.json": `${JSON.stringify({ name: "mono", private: true, workspaces: ["a"] })}\n`,
      "a/package.json": `${JSON.stringify({ name: "@s/a", version: "0.0.0" })}\n`,
    }),
  );

const remote = {
  "git remote get-url origin": { stdout: "git@github.com:Owner/repo.git\n" },
};

describe("repoFromRemote", () => {
  it("parses https, ssh, and ssh:// GitHub remotes", () => {
    assert.equal(
      repoFromRemote("https://github.com/Owner/repo.git"),
      "Owner/repo",
    );
    assert.equal(repoFromRemote("https://github.com/Owner/repo"), "Owner/repo");
    assert.equal(
      repoFromRemote("git@github.com:Owner/repo.git\n"),
      "Owner/repo",
    );
    assert.equal(
      repoFromRemote("ssh://git@github.com/Owner/repo.git"),
      "Owner/repo",
    );
  });
  it("rejects other hosts", () => {
    assert.throws(() => repoFromRemote("https://gitlab.com/o/r.git"), /GitHub/);
  });
});

describe("trustArgs", () => {
  it("trusts a workflow for direct publish", () => {
    assert.deepEqual(trustArgs("@s/a", "Owner/repo", "release.yml"), [
      "trust",
      "github",
      "@s/a",
      "--file",
      "release.yml",
      "--repo",
      "Owner/repo",
      "--allow-publish",
      "--yes",
    ]);
  });
});

describe("trustsWorkflow", () => {
  it("matches the exact workflow file, not a longer name containing it", () => {
    assert.equal(
      trustsWorkflow("github release.yml Owner/repo", "release.yml"),
      true,
    );
    assert.equal(
      trustsWorkflow("github .github/workflows/release.yml", "release.yml"),
      true,
    );
    assert.equal(
      trustsWorkflow("github prerelease.yml Owner/repo", "release.yml"),
      false,
    );
    assert.equal(
      trustsWorkflow("github release.yml.bak", "release.yml"),
      false,
    );
    assert.equal(trustsWorkflow("", "release.yml"), false);
  });
});

describe("setupTrust", () => {
  it("trusts an existing package and triggers the workflow", async () => {
    const { calls, runner } = machine({
      ...remote,
      "npm whoami": { stdout: "me" },
    });
    await setupTrust({ fs: fs(), root: ".", runner, log: () => {} });
    assert.ok(
      calls.includes(
        "npm trust github @s/a --file release.yml --repo Owner/repo --allow-publish --yes",
      ),
    );
    assert.ok(
      calls.includes(
        "gh workflow run release.yml --repo=Owner/repo --ref=main",
      ),
    );
    assert.ok(!calls.some((c) => c.startsWith("npm publish")));
  });

  it("publishes the package as checked out when it does not exist yet", async () => {
    const { calls, runner } = machine({
      ...remote,
      "npm view": { returncode: 1 },
    });
    await setupTrust({ fs: fs(), root: ".", runner, log: () => {} });
    assert.ok(calls.includes("npm publish --workspace=@s/a --access=public"));
    assert.ok(calls.some((c) => c.startsWith("npm trust github @s/a")));
  });

  it("logs in when there is no npm session", async () => {
    const { calls, runner } = machine({
      ...remote,
      "npm whoami": { returncode: 1 },
    });
    await setupTrust({ fs: fs(), root: ".", runner, log: () => {} });
    assert.ok(calls.includes("npm login --auth-type=web"));
  });

  it("still trusts release.yml when only a similarly named workflow is trusted", async () => {
    const { calls, runner } = machine({
      ...remote,
      "npm trust list": { stdout: "github prerelease.yml Owner/repo" },
    });
    await setupTrust({ fs: fs(), root: ".", runner, log: () => {} });
    assert.ok(calls.some((c) => c.startsWith("npm trust github @s/a")));
  });

  it("skips a package that already trusts the workflow", async () => {
    const { calls, runner } = machine({
      ...remote,
      "npm trust list": { stdout: "github release.yml Owner/repo" },
    });
    await setupTrust({ fs: fs(), root: ".", runner, log: () => {} });
    assert.ok(!calls.some((c) => c.startsWith("npm trust github")));
  });
});
