import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { PageDescriptor, PageModule } from "./ssg.ts";

/**
 * Scan `<rootDir>/<pagesDir>` recursively for `page.ts` sentinels.
 * Each sentinel becomes one PageDescriptor whose route is derived from the
 * folder path by stripping (group) segments (any folder whose name is wrapped
 * in parentheses) and treating the pages root as "/".
 *
 * Dynamic segments ([bracket] folders) are expanded by calling
 * `generateStaticParams` on the module; each param set produces one concrete
 * PageDescriptor whose `default`/`head` wrappers forward the resolved params.
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

  const staticSentinels: string[] = [];
  const dynamicSentinels: string[] = [];
  for (const s of sentinels) {
    const relDir = s.slice(pagesRoot.length, -"/page.ts".length);
    if (isDynamic(relDir)) {
      dynamicSentinels.push(s);
    } else {
      staticSentinels.push(s);
    }
  }

  // Build static descriptors with collision detection.
  const routeToPath = new Map<string, string>();
  const staticDescriptors: PageDescriptor[] = await Promise.all(
    staticSentinels.map(async (sentinelPath) => {
      const relDir = sentinelPath.slice(pagesRoot.length, -"/page.ts".length);
      const route = deriveRoute(relDir);
      const prev = routeToPath.get(route);
      if (prev !== undefined) {
        throw new Error(
          `Route collision at "${route}": ${prev} and ${sentinelPath} both derive the same route`,
        );
      }
      routeToPath.set(route, sentinelPath);
      const imported = (await import(sentinelPath)) as { default: PageModule };
      return { route, module: imported.default };
    }),
  );

  // Expand dynamic sentinels.
  const dynamicDescriptors: PageDescriptor[] = [];
  for (const sentinelPath of dynamicSentinels) {
    const relDir = sentinelPath.slice(pagesRoot.length, -"/page.ts".length);
    const routeTemplate = deriveRoute(relDir);
    const imported = (await import(sentinelPath)) as { default: PageModule };
    const originalModule = imported.default;

    if (!originalModule.generateStaticParams) {
      throw new Error(
        `Dynamic route "${sentinelPath}" has no generateStaticParams export`,
      );
    }

    const paramSets = await originalModule.generateStaticParams();
    if (!Array.isArray(paramSets)) {
      throw new Error(
        `generateStaticParams for "${sentinelPath}" must return an array`,
      );
    }

    for (const params of paramSets) {
      const route = fillTemplate(routeTemplate, params);
      const label = `${sentinelPath} (${Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")})`;
      const prev = routeToPath.get(route);
      if (prev !== undefined) {
        throw new Error(
          `Route collision at "${route}": ${prev} and ${label} both derive the same route`,
        );
      }
      routeToPath.set(route, label);

      const originalHead = originalModule.head;
      const wrappedModule: PageModule = {
        ...originalModule,
        default: () => originalModule.default(params),
        head: originalHead ? () => originalHead(params) : undefined,
      };

      dynamicDescriptors.push({ route, module: wrappedModule });
    }
  }

  return [...staticDescriptors, ...dynamicDescriptors];
}

function isDynamic(relDir: string): boolean {
  return relDir.split("/").some((s) => /^\[.*\]$/.test(s));
}

function fillTemplate(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/\[([^\]]+)\]/g, (_match, name) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`Missing param "${name}" for template "${template}"`);
    }
    if (value.includes("/")) {
      throw new Error(`Param "${name}" value "${value}" must not contain "/"`);
    }
    return value;
  });
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
