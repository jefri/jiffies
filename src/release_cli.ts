#!/usr/bin/env node
/**
 * jiffies-release: CalVer releases and npm Trusted Publishing setup.
 *
 *   jiffies-release stamp [--dry-run] [--if-changed]
 *   jiffies-release trust [--workflow release.yml] [--ref main] [--repo owner/repo]
 *
 * Run from the repository root. See `release.ts` and `npm_trust.ts`.
 */
import { parseArgs } from "node:util";
import { NodeFileSystem } from "./fs_node.ts";
import { setupTrust } from "./npm_trust.ts";
import { release } from "./release.ts";

const USAGE = `Usage: jiffies-release <command>

  stamp [--dry-run] [--if-changed]   Cut CalVer releases of the public packages.
  trust [--workflow F] [--ref B] [--repo owner/repo]
                                     One-time npm Trusted Publishing setup.`;

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      "if-changed": { type: "boolean", default: false },
      workflow: { type: "string" },
      ref: { type: "string" },
      repo: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const root = process.cwd();
  const fs = new NodeFileSystem(root);
  const [command] = positionals;

  if (values.help || !command) {
    console.log(USAGE);
    return values.help ? 0 : 2;
  }
  if (command === "stamp") {
    await release({
      fs,
      root,
      dryRun: values["dry-run"],
      ifChanged: values["if-changed"],
      inActions: process.env.GITHUB_ACTIONS === "true",
    });
    return 0;
  }
  if (command === "trust") {
    await setupTrust({
      fs,
      root,
      ...(values.workflow ? { workflow: values.workflow } : {}),
      ...(values.ref ? { ref: values.ref } : {}),
      ...(values.repo ? { repo: values.repo } : {}),
    });
    return 0;
  }
  console.error(`Unknown command: ${command}\n\n${USAGE}`);
  return 2;
}

if (import.meta.main) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    },
  );
}
