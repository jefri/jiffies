import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FileSystem, ObjectFileSystemAdapter } from "./fs.ts";
import { discoverPackages, release, tagPrefix } from "./release.ts";
import { makeRunner, type Output } from "./sh.ts";

const NOW = new Date(2026, 10, 11); // 2026 week 46

const json = (value: object) => `${JSON.stringify(value, null, 2)}\n`;

/** A fake machine: records argv, answers git/npm queries from `answers`. */
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

function project(files: Record<string, string>) {
  const adapter = new ObjectFileSystemAdapter(files);
  return new FileSystem(adapter);
}

const monorepo = () =>
  project({
    "package.json": json({
      name: "mono",
      private: true,
      workspaces: ["a", "libs/*"],
    }),
    "a/package.json": json({ name: "@s/a", version: "0.0.0" }),
    "libs/b/package.json": json({ name: "@s/b", version: "0.0.0" }),
    "libs/c/package.json": json({
      name: "@s/c",
      version: "0.0.0",
      private: true,
    }),
  });

describe("discoverPackages", () => {
  it("returns the root package when there are no workspaces", async () => {
    const fs = project({
      "package.json": json({ name: "solo", version: "2026.4.1" }),
    });
    const [pkg, ...rest] = await discoverPackages(fs);
    assert.equal(rest.length, 0);
    assert.deepEqual(
      [pkg?.name, pkg?.dir, pkg?.version],
      ["solo", ".", "2026.4.1"],
    );
  });

  it("expands workspaces, including dir/* globs, and keeps private flags", async () => {
    const found = await discoverPackages(monorepo());
    assert.deepEqual(
      found.map((p) => [p.name, p.dir, p.private]),
      [
        ["@s/a", "a", false],
        ["@s/b", "libs/b", false],
        ["@s/c", "libs/c", true],
      ],
    );
  });
});

describe("tagPrefix", () => {
  it("is v for the root package and <dir>-v for a workspace", () => {
    assert.equal(tagPrefix("."), "v");
    assert.equal(tagPrefix("a"), "a-v");
    assert.equal(tagPrefix("libs/b"), "libs-b-v");
  });
});

describe("release", () => {
  it("commits, tags, pushes, and publishes a root package with commit: true", async () => {
    const fs = project({
      "package.json": json({
        name: "solo",
        version: "2026.45.3",
        release: { commit: true, shipped: ["src"] },
      }),
    });
    const { calls, runner } = machine({
      "git tag --list": { stdout: "v2026.45.3\n" },
    });
    const out = await release({
      fs,
      root: ".",
      runner,
      now: NOW,
      log: () => {},
    });
    assert.deepEqual(out, ["v2026.46.0"]);
    assert.equal(
      JSON.parse(await fs.readFile("package.json")).version,
      "2026.46.0",
    );
    assert.ok(calls.includes("git commit -m chore(release): 2026.46.0"));
    assert.ok(calls.includes("git tag -a v2026.46.0 -m Release 2026.46.0"));
    assert.ok(calls.includes("git push origin HEAD --follow-tags"));
    assert.ok(calls.includes("npm publish --access=public"));
  });

  it("releases only changed, public workspaces, tagging without a commit", async () => {
    const fs = monorepo();
    const { calls, runner } = machine({
      "git tag --list a-v*": { stdout: "a-v2026.46.0\n" },
      "git tag --list libs-b-v*": { stdout: "" },
      "git log --oneline a-v2026.46.0..HEAD": { stdout: "" }, // a unchanged
    });
    const out = await release({
      fs,
      root: ".",
      runner,
      now: NOW,
      ifChanged: true,
      log: () => {},
    });
    assert.deepEqual(out, ["libs-b-v2026.46.0"]);
    assert.ok(calls.includes("npm publish --workspace=@s/b --access=public"));
    assert.ok(!calls.some((c) => c.startsWith("git commit")));
    assert.ok(!calls.some((c) => c.includes("@s/a") || c.includes("@s/c")));
  });

  it("continues the micro from existing tags in the same week", async () => {
    const fs = monorepo();
    const { runner } = machine({
      "git tag --list a-v*": { stdout: "a-v2026.46.0\na-v2026.46.1\n" },
    });
    const out = await release({
      fs,
      root: ".",
      runner,
      now: NOW,
      log: () => {},
    });
    assert.ok(out.includes("a-v2026.46.2"));
  });

  it("changes nothing in a dry run", async () => {
    const fs = monorepo();
    const { calls, runner } = machine();
    await release({
      fs,
      root: ".",
      runner,
      now: NOW,
      dryRun: true,
      log: () => {},
    });
    assert.equal(
      JSON.parse(await fs.readFile("a/package.json")).version,
      "0.0.0",
    );
    assert.ok(!calls.some((c) => /^git (add|commit|tag -a|push)/.test(c)));
    assert.ok(
      calls.some(
        (c) => c === "npm publish --workspace=@s/a --access=public --dry-run",
      ),
    );
  });

  it("refuses a live run from a dirty tree", async () => {
    const { runner } = machine({ "git status": { stdout: " M file.ts\n" } });
    await assert.rejects(
      release({ fs: monorepo(), root: ".", runner, now: NOW, log: () => {} }),
      /not clean/,
    );
  });

  it("skips the npm session check in GitHub Actions", async () => {
    const { calls, runner } = machine();
    await release({
      fs: monorepo(),
      root: ".",
      runner,
      now: NOW,
      inActions: true,
      log: () => {},
    });
    assert.ok(!calls.includes("npm whoami"));
  });

  it("treats a missing npm session as data: dry run warns, live run aborts", async () => {
    const answers = { "npm whoami": { returncode: 1 } };
    const dry = machine(answers);
    await release({
      fs: monorepo(),
      root: ".",
      runner: dry.runner,
      now: NOW,
      dryRun: true,
      log: () => {},
    });
    await assert.rejects(
      release({
        fs: monorepo(),
        root: ".",
        runner: machine(answers).runner,
        now: NOW,
        log: () => {},
      }),
      /not authenticated/,
    );
    assert.ok(
      dry.calls.includes("npm whoami"),
      "ran `npm whoami`, not `npm whoami with`",
    );
  });
});
