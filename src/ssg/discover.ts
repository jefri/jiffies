import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { PageDescriptor, PageModule } from "./ssg.ts";

/**
 * Scan `<rootDir>/<pagesDir>` recursively for `page.ts` sentinels.
 * Each sentinel becomes one PageDescriptor whose route is derived from the
 * folder path by stripping (group) segments (any folder whose name is wrapped
 * in parentheses) and treating the pages root as "/".
 *
 * Throws with a message naming `pagesDir` if it does not exist or contains no
 * sentinels. Caller should catch and exit 1.
 */
export async function discoverPages(
  rootDir: string,
  pagesDir: string,
): Promise<PageDescriptor[]> {
  const pagesRoot = join(rootDir, pagesDir);

  const sentinels: string[] = [];
  await scan(pagesRoot, sentinels);

  if (sentinels.length === 0) {
    throw new Error(`No page.ts sentinels found in ${pagesDir}`);
  }

  const pages = await Promise.all(
    sentinels.map(async (sentinelPath) => {
      const relDir = sentinelPath.slice(pagesRoot.length, -"/page.ts".length);
      const route = deriveRoute(relDir);
      const imported = (await import(sentinelPath)) as { default: PageModule };
      return { route, module: imported.default };
    }),
  );

  // Detect route collisions caused by group-folder stripping.
  const seen = new Map<string, string>();
  for (const { route } of pages) {
    const prev = seen.get(route);
    if (prev !== undefined) {
      throw new Error(
        `Route collision at "${route}": ${prev} and another sentinel both derive the same route`,
      );
    }
    seen.set(route, route);
  }

  return pages;
}

function deriveRoute(relDir: string): string {
  const segments = relDir.split("/").filter(Boolean);
  const stripped = segments.filter((s) => !/^\(.*\)$/.test(s));
  return "/" + stripped.join("/");
}

async function scan(dir: string, results: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await scan(fullPath, results);
    } else if (entry.name === "page.ts") {
      results.push(fullPath);
    }
  }
}
