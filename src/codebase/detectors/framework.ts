import type { FrameworkInfo } from "../types.js";
import { readPackageJson, getDep } from "./utils.js";

const FRAMEWORKS = [
  { pkg: "@nestjs/core", name: "nestjs" },
  { pkg: "hono", name: "hono" },
  { pkg: "fastify", name: "fastify" },
  { pkg: "koa", name: "koa" },
  { pkg: "express", name: "express" },
] as const;

export async function detectFramework(
  projectPath: string
): Promise<FrameworkInfo> {
  const pkg = await readPackageJson(projectPath);
  if (!pkg) return { name: null, version: null };

  for (const fw of FRAMEWORKS) {
    const version = getDep(pkg, fw.pkg);
    if (version) {
      return { name: fw.name, version };
    }
  }

  return { name: null, version: null };
}
