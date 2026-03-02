import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface WriteOptions {
  outputPath: string;
  figmaUrl: string;
  fileName: string;
  prdFile?: string;
}

export async function writeSpec(
  spec: string,
  options: WriteOptions
): Promise<string> {
  const fullPath = resolve(options.outputPath);
  const now = new Date().toISOString();

  const prdLine = options.prdFile ? `\n> PRD: **${options.prdFile}**` : "";

  const content = `# Backend Technical Specification

> Generated from Figma design: **${options.fileName}**${prdLine}
> Source: ${options.figmaUrl}
> Generated at: ${now}
> Tool: design-spec

---

${spec}
`;

  await writeFile(fullPath, content, "utf-8");
  return fullPath;
}
