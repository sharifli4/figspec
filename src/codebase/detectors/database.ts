import { join } from "node:path";
import type { DatabaseInfo } from "../types.js";
import { readPackageJson, readFileOptional, getDep, fileExists } from "./utils.js";

const ORM_PACKAGES = [
  { pkg: "prisma", name: "prisma" },
  { pkg: "@prisma/client", name: "prisma" },
  { pkg: "drizzle-orm", name: "drizzle" },
  { pkg: "typeorm", name: "typeorm" },
  { pkg: "sequelize", name: "sequelize" },
  { pkg: "mongoose", name: "mongoose" },
  { pkg: "knex", name: "knex" },
] as const;

const DB_DRIVER_MAP: Record<string, string> = {
  pg: "postgresql",
  "pg-native": "postgresql",
  postgres: "postgresql",
  mysql2: "mysql",
  mysql: "mysql",
  "better-sqlite3": "sqlite",
  sqlite3: "sqlite",
  mongoose: "mongodb",
  mongodb: "mongodb",
};

export async function detectDatabase(
  projectPath: string
): Promise<DatabaseInfo> {
  const pkg = await readPackageJson(projectPath);
  if (!pkg) return { orm: null, ormVersion: null, databaseType: null, schemaSample: null };

  // Detect ORM
  let orm: string | null = null;
  let ormVersion: string | null = null;
  for (const entry of ORM_PACKAGES) {
    const ver = getDep(pkg, entry.pkg);
    if (ver) {
      orm = entry.name;
      ormVersion = ver;
      break;
    }
  }

  // Detect database type from driver packages
  let databaseType: string | null = null;
  for (const [driver, dbType] of Object.entries(DB_DRIVER_MAP)) {
    if (getDep(pkg, driver)) {
      databaseType = dbType;
      break;
    }
  }

  // Read schema sample
  const schemaSample = await readSchemaSample(projectPath, orm);

  return { orm, ormVersion, databaseType, schemaSample };
}

async function readSchemaSample(
  projectPath: string,
  orm: string | null
): Promise<string | null> {
  const MAX_LINES = 80;

  if (orm === "prisma") {
    const content = await readFileOptional(
      join(projectPath, "prisma", "schema.prisma")
    );
    if (content) return truncateLines(content, MAX_LINES);
  }

  if (orm === "drizzle") {
    // Check common locations for drizzle schema
    for (const candidate of [
      "src/db/schema.ts",
      "src/schema.ts",
      "db/schema.ts",
      "drizzle/schema.ts",
    ]) {
      const content = await readFileOptional(join(projectPath, candidate));
      if (content) return truncateLines(content, MAX_LINES);
    }
  }

  if (orm === "typeorm") {
    // Look for an entity file
    for (const dir of ["src/entity", "src/entities"]) {
      const entityDir = join(projectPath, dir);
      if (await fileExists(entityDir)) {
        // Read first entity file found
        const { readdir } = await import("node:fs/promises");
        try {
          const files = await readdir(entityDir);
          const entityFile = files.find(
            (f) => f.endsWith(".ts") || f.endsWith(".js")
          );
          if (entityFile) {
            const content = await readFileOptional(
              join(entityDir, entityFile)
            );
            if (content) return truncateLines(content, MAX_LINES);
          }
        } catch {
          // Skip
        }
      }
    }
  }

  if (orm === "mongoose") {
    for (const dir of ["src/models", "src/model", "models"]) {
      const modelDir = join(projectPath, dir);
      if (await fileExists(modelDir)) {
        const { readdir } = await import("node:fs/promises");
        try {
          const files = await readdir(modelDir);
          const modelFile = files.find(
            (f) => f.endsWith(".ts") || f.endsWith(".js")
          );
          if (modelFile) {
            const content = await readFileOptional(
              join(modelDir, modelFile)
            );
            if (content) return truncateLines(content, MAX_LINES);
          }
        } catch {
          // Skip
        }
      }
    }
  }

  return null;
}

function truncateLines(content: string, maxLines: number): string {
  const lines = content.split("\n");
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join("\n") + "\n// ... truncated";
}
