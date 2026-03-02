import { readFile, access } from "node:fs/promises";
import { resolve, basename, extname, join } from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".md", ".txt", ".yaml", ".yml", ".json"]);

const PRD_CANDIDATES = [
  "prd.md",
  "PRD.md",
  "prd.txt",
  "PRD.txt",
  "prd.yaml",
  "prd.yml",
  "prd.json",
];

export interface PrdDocument {
  filePath: string;
  fileName: string;
  content: string;
}

export async function loadPrd(path: string): Promise<PrdDocument> {
  const filePath = resolve(path);
  const fileName = basename(filePath);
  const ext = extname(fileName).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported PRD file type "${ext}". Supported: ${[...SUPPORTED_EXTENSIONS].join(", ")}`
    );
  }

  const content = await readFile(filePath, "utf-8");

  if (content.trim().length === 0) {
    throw new Error(`PRD file is empty: ${filePath}`);
  }

  return { filePath, fileName, content };
}

export async function detectPrd(projectDir: string): Promise<string | null> {
  for (const candidate of PRD_CANDIDATES) {
    const candidatePath = join(projectDir, candidate);
    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      // not found, try next
    }
  }
  return null;
}
