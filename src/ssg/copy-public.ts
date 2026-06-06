import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Copy every file under `<rootDir>/<publicDir>` verbatim into `<outDir>`.
 * Recurses into subdirectories. A missing `publicDir` is a no-op.
 * Ensures target directory exists (recursive mkdir) before each copy.
 */
export async function copyPublic(
  rootDir: string,
  publicDir: string,
  outDir: string,
): Promise<string[]> {
  const src = join(rootDir, publicDir);

  try {
    await stat(src);
  } catch {
    return [];
  }

  const copied: string[] = [];
  await copyDir(src, outDir, copied);
  return copied;
}

async function copyDir(
  src: string,
  dest: string,
  copied: string[],
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, copied);
    } else {
      await copyFile(srcPath, destPath);
      copied.push(destPath);
    }
  }
}
