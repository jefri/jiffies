/**
 * Rewrite `import "<S>";` lines inside <script type="module" defer> blocks in
 * `htmlContent`, replacing each original specifier `S` with the hashed asset URL
 * from `specToUrl`. Lines whose specifier is not in the map are left unchanged.
 *
 * This is a string substitution, not DOM parsing — the exact format emitted by
 * ssg.ts is `import "<S>";` on its own line inside the script block.
 */
export function rewriteClientSpecifiers(
  htmlContent: string,
  specToUrl: Map<string, string>,
): string {
  let result = htmlContent;
  for (const [spec, url] of specToUrl) {
    result = result.replaceAll(`import "${spec}";`, `import "${url}";`);
  }
  return result;
}
