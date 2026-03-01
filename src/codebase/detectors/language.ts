import { join } from "node:path";
import type { LanguageInfo } from "../types.js";
import { readPackageJson, readJsonFile, readFileOptional, hasDep } from "./utils.js";

export async function detectLanguage(
  projectPath: string
): Promise<LanguageInfo> {
  const pkg = await readPackageJson(projectPath);

  // Detect primary language
  const isTypeScript = pkg
    ? hasDep(pkg, "typescript") || hasDep(pkg, "tsx")
    : false;
  const primary = isTypeScript ? "typescript" : "javascript";

  // Detect node version from .nvmrc, .node-version, or engines
  const nodeVersion = await detectNodeVersion(projectPath, pkg);

  // Detect strict mode from tsconfig
  let strictMode = false;
  if (isTypeScript) {
    const tsconfig = await readJsonFile(join(projectPath, "tsconfig.json"));
    if (tsconfig) {
      const compilerOptions = tsconfig.compilerOptions as
        | Record<string, unknown>
        | undefined;
      strictMode = compilerOptions?.strict === true;
    }
  }

  // Detect module system
  const moduleSystem = detectModuleSystem(pkg);

  return { primary, nodeVersion, strictMode, moduleSystem };
}

async function detectNodeVersion(
  projectPath: string,
  pkg: Record<string, unknown> | null
): Promise<string | null> {
  // Check .nvmrc
  const nvmrc = await readFileOptional(join(projectPath, ".nvmrc"));
  if (nvmrc) return nvmrc.trim();

  // Check .node-version
  const nodeVersion = await readFileOptional(
    join(projectPath, ".node-version")
  );
  if (nodeVersion) return nodeVersion.trim();

  // Check engines in package.json
  if (pkg) {
    const engines = pkg.engines as Record<string, string> | undefined;
    if (engines?.node) return engines.node;
  }

  return null;
}

function detectModuleSystem(
  pkg: Record<string, unknown> | null
): "esm" | "commonjs" {
  if (!pkg) return "commonjs";
  return pkg.type === "module" ? "esm" : "commonjs";
}
