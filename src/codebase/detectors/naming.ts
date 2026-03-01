import { basename } from "node:path";
import { readFile } from "node:fs/promises";
import type { NamingConventions } from "../types.js";
import { globSourceFiles } from "./utils.js";

export async function detectNaming(
  projectPath: string
): Promise<NamingConventions> {
  const files = await globSourceFiles(projectPath, 20);

  const fileConvention = classifyFileNaming(files);
  const variableConvention = await classifyVariableNaming(files.slice(0, 5));

  return { files: fileConvention, variables: variableConvention };
}

function classifyFileNaming(files: string[]): string | null {
  if (files.length === 0) return null;

  const counts: Record<string, number> = {
    "kebab-case": 0,
    camelCase: 0,
    PascalCase: 0,
    snake_case: 0,
  };

  for (const file of files) {
    const name = basename(file).replace(/\.(ts|js|tsx|jsx)$/, "");
    // Remove common suffixes like .controller, .service, .module
    const base = name.split(".")[0];
    if (!base || base === "index") continue;

    if (base.includes("-")) counts["kebab-case"]++;
    else if (base.includes("_")) counts["snake_case"]++;
    else if (base[0] === base[0].toUpperCase()) counts["PascalCase"]++;
    else counts["camelCase"]++;
  }

  let max = 0;
  let result: string | null = null;
  for (const [convention, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      result = convention;
    }
  }

  return result;
}

async function classifyVariableNaming(
  files: string[]
): Promise<string | null> {
  const exportedNames: string[] = [];
  const exportPattern = /export\s+(?:const|function|class)\s+(\w+)/g;

  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      let match: RegExpExecArray | null;
      while ((match = exportPattern.exec(content)) !== null) {
        exportedNames.push(match[1]);
      }
    } catch {
      // Skip unreadable files
    }
  }

  if (exportedNames.length === 0) return null;

  const counts: Record<string, number> = {
    camelCase: 0,
    PascalCase: 0,
    snake_case: 0,
    SCREAMING_SNAKE: 0,
  };

  for (const name of exportedNames) {
    if (name === name.toUpperCase() && name.includes("_"))
      counts["SCREAMING_SNAKE"]++;
    else if (name.includes("_")) counts["snake_case"]++;
    else if (name[0] === name[0].toUpperCase()) counts["PascalCase"]++;
    else counts["camelCase"]++;
  }

  let max = 0;
  let result: string | null = null;
  for (const [convention, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      result = convention;
    }
  }

  return result;
}
