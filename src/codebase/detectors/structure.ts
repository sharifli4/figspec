import { join } from "node:path";
import type { FolderStructure } from "../types.js";
import { fileExists, listDirectories } from "./utils.js";

const SOURCE_ROOTS = ["src", "app", "lib", "server"] as const;

const KNOWN_PATTERNS: Record<string, string> = {
  "controllers,services,modules": "nestjs-modular",
  "controllers,models,routes": "mvc",
  "routes,models,middleware": "mvc",
  "routes,controllers,services": "layered",
  "api,lib,components": "nextjs-app",
  "pages,api": "nextjs-pages",
};

export async function detectStructure(
  projectPath: string
): Promise<FolderStructure> {
  // Find source root
  let sourceRoot: string | null = null;
  for (const root of SOURCE_ROOTS) {
    if (await fileExists(join(projectPath, root))) {
      sourceRoot = root;
      break;
    }
  }

  if (!sourceRoot) {
    return { sourceRoot: null, directories: [], pattern: null };
  }

  const directories = await listDirectories(join(projectPath, sourceRoot));

  // Try to classify pattern
  const pattern = classifyPattern(directories);

  return { sourceRoot, directories, pattern };
}

function classifyPattern(directories: string[]): string | null {
  const dirSet = new Set(directories);

  for (const [key, pattern] of Object.entries(KNOWN_PATTERNS)) {
    const required = key.split(",");
    if (required.every((d) => dirSet.has(d))) {
      return pattern;
    }
  }

  // Heuristic fallback
  if (dirSet.has("modules") || dirSet.has("features")) return "feature-based";
  if (dirSet.has("controllers") && dirSet.has("services")) return "layered";

  return null;
}
