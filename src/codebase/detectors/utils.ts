import { readFile, readdir, access, stat } from "node:fs/promises";
import { join, extname } from "node:path";

export async function readPackageJson(
  projectPath: string
): Promise<Record<string, unknown> | null> {
  return readJsonFile(join(projectPath, "package.json"));
}

export async function readJsonFile(
  filePath: string
): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readFileOptional(
  filePath: string
): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export async function globSourceFiles(
  dirPath: string,
  limit: number = 50
): Promise<string[]> {
  const results: string[] = [];
  const skipDirs = new Set([
    "node_modules",
    "dist",
    "build",
    ".git",
    ".next",
    "coverage",
  ]);

  async function walk(dir: string): Promise<void> {
    if (results.length >= limit) return;
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= limit) return;
        if (entry.isDirectory()) {
          if (!skipDirs.has(entry.name) && !entry.name.startsWith(".")) {
            await walk(join(dir, entry.name));
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (ext === ".ts" || ext === ".js") {
            results.push(join(dir, entry.name));
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  await walk(dirPath);
  return results;
}

export function getDep(
  pkg: Record<string, unknown>,
  name: string
): string | null {
  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;
  return deps?.[name] ?? devDeps?.[name] ?? null;
}

export function hasDep(
  pkg: Record<string, unknown>,
  name: string
): boolean {
  return getDep(pkg, name) !== null;
}
