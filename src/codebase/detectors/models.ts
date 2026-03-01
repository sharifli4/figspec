import { join } from "node:path";
import { readdir } from "node:fs/promises";
import type { ExistingModel } from "../types.js";
import { readFileOptional, fileExists } from "./utils.js";

export async function detectExistingModels(
  projectPath: string,
  orm: string | null
): Promise<ExistingModel[]> {
  if (!orm) return [];

  switch (orm) {
    case "prisma":
      return detectPrismaModels(projectPath);
    case "drizzle":
      return detectDrizzleModels(projectPath);
    case "typeorm":
      return detectTypeormModels(projectPath);
    case "mongoose":
      return detectMongooseModels(projectPath);
    default:
      return [];
  }
}

async function detectPrismaModels(
  projectPath: string
): Promise<ExistingModel[]> {
  const content = await readFileOptional(
    join(projectPath, "prisma", "schema.prisma")
  );
  if (!content) return [];

  const models: ExistingModel[] = [];
  const modelPattern = /model\s+(\w+)\s*\{([^}]+)\}/g;

  let match: RegExpExecArray | null;
  while ((match = modelPattern.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields = extractPrismaFields(body);
    models.push({ name, source: "prisma", fields });
  }

  return models;
}

function extractPrismaFields(body: string): string[] {
  const fields: string[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@"))
      continue;
    const fieldMatch = trimmed.match(/^(\w+)\s+/);
    if (fieldMatch) {
      fields.push(fieldMatch[1]);
    }
  }
  return fields;
}

async function detectDrizzleModels(
  projectPath: string
): Promise<ExistingModel[]> {
  const candidates = [
    "src/db/schema.ts",
    "src/schema.ts",
    "db/schema.ts",
    "drizzle/schema.ts",
  ];

  for (const candidate of candidates) {
    const content = await readFileOptional(join(projectPath, candidate));
    if (!content) continue;

    const models: ExistingModel[] = [];
    const tablePattern = /(?:pgTable|mysqlTable|sqliteTable)\(\s*["'](\w+)["']/g;

    let match: RegExpExecArray | null;
    while ((match = tablePattern.exec(content)) !== null) {
      models.push({ name: match[1], source: "drizzle", fields: [] });
    }

    if (models.length > 0) return models;
  }

  return [];
}

async function detectTypeormModels(
  projectPath: string
): Promise<ExistingModel[]> {
  const models: ExistingModel[] = [];

  for (const dir of ["src/entity", "src/entities"]) {
    const entityDir = join(projectPath, dir);
    if (!(await fileExists(entityDir))) continue;

    try {
      const files = await readdir(entityDir);
      for (const file of files) {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
        const content = await readFileOptional(join(entityDir, file));
        if (!content) continue;

        const entityMatch = content.match(
          /@Entity\((?:["'](\w+)["'])?\)[\s\S]*?class\s+(\w+)/
        );
        if (entityMatch) {
          const name = entityMatch[1] || entityMatch[2];
          const fields = extractTypeormFields(content);
          models.push({ name, source: "typeorm", fields });
        }
      }
    } catch {
      // Skip
    }
  }

  return models;
}

function extractTypeormFields(content: string): string[] {
  const fields: string[] = [];
  const columnPattern = /@(?:Column|PrimaryGeneratedColumn|PrimaryColumn|ManyToOne|OneToMany|ManyToMany|OneToOne)\([\s\S]*?\)\s*(?:\w+\s+)?\s*(\w+)\s*[!?]?\s*:/g;

  let match: RegExpExecArray | null;
  while ((match = columnPattern.exec(content)) !== null) {
    fields.push(match[1]);
  }

  return fields;
}

async function detectMongooseModels(
  projectPath: string
): Promise<ExistingModel[]> {
  const models: ExistingModel[] = [];

  for (const dir of ["src/models", "src/model", "models"]) {
    const modelDir = join(projectPath, dir);
    if (!(await fileExists(modelDir))) continue;

    try {
      const files = await readdir(modelDir);
      for (const file of files) {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
        const content = await readFileOptional(join(modelDir, file));
        if (!content) continue;

        const modelMatch = content.match(
          /mongoose\.model\s*(?:<[^>]+>)?\(\s*["'](\w+)["']/
        );
        if (modelMatch) {
          models.push({
            name: modelMatch[1],
            source: "mongoose",
            fields: [],
          });
        }
      }
    } catch {
      // Skip
    }
  }

  return models;
}
