import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const CACHE_DIR = ".figma-cache";
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheKey(parts: string[]): string {
  const hash = createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
  return hash;
}

function cachePath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

export async function getCached(parts: string[]): Promise<unknown | null> {
  const path = cachePath(cacheKey(parts));
  try {
    const info = await stat(path);
    if (Date.now() - info.mtimeMs > DEFAULT_TTL_MS) {
      return null; // expired
    }
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCache(parts: string[], data: unknown): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const path = cachePath(cacheKey(parts));
  await writeFile(path, JSON.stringify(data), "utf-8");
}
