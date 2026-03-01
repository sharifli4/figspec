import { readFile } from "node:fs/promises";
import type { ApiStyleInfo } from "../types.js";
import { readPackageJson, hasDep, globSourceFiles } from "./utils.js";

export async function detectApiStyle(
  projectPath: string
): Promise<ApiStyleInfo> {
  const pkg = await readPackageJson(projectPath);
  if (!pkg) return { pattern: null, routeSamples: [], versioned: false };

  // Detect pattern from packages
  if (hasDep(pkg, "@trpc/server") || hasDep(pkg, "trpc")) {
    return { pattern: "trpc", routeSamples: [], versioned: false };
  }

  if (
    hasDep(pkg, "graphql") ||
    hasDep(pkg, "@apollo/server") ||
    hasDep(pkg, "type-graphql") ||
    hasDep(pkg, "@nestjs/graphql")
  ) {
    return { pattern: "graphql", routeSamples: [], versioned: false };
  }

  // Default to REST, try to find route samples
  const routeSamples = await findRouteSamples(projectPath);
  const versioned = routeSamples.some(
    (s) => s.includes("/v1/") || s.includes("/v2/") || s.includes("/api/v")
  );

  return { pattern: "rest", routeSamples, versioned };
}

async function findRouteSamples(projectPath: string): Promise<string[]> {
  const samples: string[] = [];
  const files = await globSourceFiles(projectPath, 30);

  const routePatterns = [
    // Express/Fastify style
    /(?:app|router|server)\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g,
    // NestJS decorators
    /@(?:Get|Post|Put|Patch|Delete)\(\s*["'`]([^"'`]*)["'`]\s*\)/g,
    // Hono style
    /\.(?:get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g,
  ];

  for (const file of files) {
    if (samples.length >= 5) break;
    try {
      const content = await readFile(file, "utf-8");
      for (const pattern of routePatterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(content)) !== null && samples.length < 5) {
          // Get the most meaningful capture group (route path)
          const route = match[2] || match[1];
          if (route && !samples.includes(route)) {
            samples.push(route);
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return samples;
}
