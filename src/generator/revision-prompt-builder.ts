import type { CodebaseProfile } from "../codebase/types.js";

export function buildRevisionPrompt(
  rawSpec: string,
  profile: CodebaseProfile
): string {
  const sections: string[] = [];

  sections.push(buildHeader());
  sections.push(buildCodebaseContext(profile));
  sections.push(buildOriginalSpec(rawSpec));
  sections.push(buildRevisionInstructions(profile));

  return sections.join("\n\n");
}

function buildHeader(): string {
  return `# Task: Revise Backend Specification to Match Existing Codebase

You are revising a backend technical specification so that it matches the conventions,
framework, ORM, and patterns of an existing codebase. The revised spec should be
directly implementable by a developer working in this project — no translation needed.`;
}

function buildCodebaseContext(profile: CodebaseProfile): string {
  const lines: string[] = ["## Codebase Profile"];

  // Language
  lines.push(`### Language`);
  lines.push(`- **Primary**: ${profile.language.primary}`);
  lines.push(`- **Module system**: ${profile.language.moduleSystem}`);
  if (profile.language.strictMode) lines.push(`- **Strict mode**: enabled`);
  if (profile.language.nodeVersion)
    lines.push(`- **Node version**: ${profile.language.nodeVersion}`);

  // Framework
  lines.push(`### Framework`);
  if (profile.framework.name) {
    lines.push(
      `- **${profile.framework.name}** (${profile.framework.version})`
    );
  } else {
    lines.push(`- No framework detected (vanilla Node.js or custom setup)`);
  }

  // Database / ORM
  lines.push(`### Database & ORM`);
  if (profile.database.orm) {
    lines.push(`- **ORM**: ${profile.database.orm} (${profile.database.ormVersion})`);
    if (profile.database.databaseType) {
      lines.push(`- **Database**: ${profile.database.databaseType}`);
    }
    if (profile.database.schemaSample) {
      lines.push(`- **Schema sample**:`);
      lines.push("```");
      lines.push(profile.database.schemaSample);
      lines.push("```");
    }
  } else {
    lines.push(`- No ORM detected`);
  }

  // Auth
  if (profile.auth.strategies.length > 0) {
    lines.push(`### Authentication`);
    lines.push(`- **Strategies**: ${profile.auth.strategies.join(", ")}`);
    lines.push(`- **Packages**: ${profile.auth.packages.join(", ")}`);
  }

  // Folder structure
  if (profile.folderStructure.sourceRoot) {
    lines.push(`### Project Structure`);
    lines.push(`- **Source root**: ${profile.folderStructure.sourceRoot}/`);
    lines.push(
      `- **Directories**: ${profile.folderStructure.directories.join(", ")}`
    );
    if (profile.folderStructure.pattern) {
      lines.push(
        `- **Detected pattern**: ${profile.folderStructure.pattern}`
      );
    }
  }

  // Naming
  lines.push(`### Naming Conventions`);
  if (profile.namingConventions.files) {
    lines.push(`- **File naming**: ${profile.namingConventions.files}`);
  }
  if (profile.namingConventions.variables) {
    lines.push(`- **Variable naming**: ${profile.namingConventions.variables}`);
  }

  // Existing models
  if (profile.existingModels.length > 0) {
    lines.push(`### Existing Models`);
    for (const model of profile.existingModels) {
      const fieldsStr =
        model.fields.length > 0 ? ` — fields: ${model.fields.join(", ")}` : "";
      lines.push(`- **${model.name}** (${model.source})${fieldsStr}`);
    }
  }

  // API style
  if (profile.apiStyle.pattern) {
    lines.push(`### API Style`);
    lines.push(`- **Pattern**: ${profile.apiStyle.pattern}`);
    if (profile.apiStyle.versioned) {
      lines.push(`- **Versioned**: yes`);
    }
    if (profile.apiStyle.routeSamples.length > 0) {
      lines.push(`- **Route samples**: ${profile.apiStyle.routeSamples.map((r) => `\`${r}\``).join(", ")}`);
    }
  }

  // Middleware
  if (profile.middleware.detected.length > 0) {
    lines.push(`### Middleware`);
    lines.push(`- **Detected**: ${profile.middleware.detected.join(", ")}`);
    if (profile.middleware.validationLibrary) {
      lines.push(
        `- **Validation library**: ${profile.middleware.validationLibrary}`
      );
    }
  }

  return lines.join("\n");
}

function buildOriginalSpec(rawSpec: string): string {
  return `## Original Specification

<original-spec>
${rawSpec}
</original-spec>`;
}

function buildRevisionInstructions(profile: CodebaseProfile): string {
  const rules: string[] = [];

  // Framework-specific rules
  if (profile.framework.name === "nestjs") {
    rules.push(
      "- Use NestJS decorators (@Controller, @Get, @Post, @Injectable, etc.)",
      "- Organize code into NestJS modules with controllers, services, and DTOs",
      "- Use NestJS dependency injection patterns",
      "- Use class-validator decorators on DTOs if class-validator is in use"
    );
  } else if (profile.framework.name === "hono") {
    rules.push(
      "- Use Hono's routing patterns (app.get(), app.post(), etc.)",
      "- Use Hono middleware patterns"
    );
  } else if (profile.framework.name === "fastify") {
    rules.push(
      "- Use Fastify plugin architecture",
      "- Use Fastify schema-based validation"
    );
  } else if (profile.framework.name === "express") {
    rules.push(
      "- Use Express Router pattern for route organization",
      "- Use Express middleware patterns"
    );
  }

  // ORM-specific rules
  if (profile.database.orm === "prisma") {
    rules.push(
      "- Rewrite all SQL DDL as Prisma schema syntax (model blocks in schema.prisma)",
      "- Use Prisma Client API for queries (prisma.model.findMany, create, update, delete)",
      "- Use Prisma relations syntax (@relation) instead of raw foreign keys"
    );
  } else if (profile.database.orm === "drizzle") {
    rules.push(
      "- Rewrite all SQL DDL as Drizzle schema definitions (pgTable(), mysqlTable(), etc.)",
      "- Use Drizzle query API for data access"
    );
  } else if (profile.database.orm === "typeorm") {
    rules.push(
      "- Rewrite all SQL DDL as TypeORM entity classes with decorators (@Entity, @Column, @PrimaryGeneratedColumn)",
      "- Use TypeORM repository pattern for queries"
    );
  } else if (profile.database.orm === "mongoose") {
    rules.push(
      "- Rewrite all SQL DDL as Mongoose Schema definitions",
      "- Use Mongoose model API for queries",
      "- Adapt relational patterns to MongoDB document model where appropriate"
    );
  }

  // API style rules
  if (profile.apiStyle.pattern === "graphql") {
    rules.push(
      "- Convert REST endpoints to GraphQL queries and mutations",
      "- Define GraphQL type definitions and resolvers"
    );
  } else if (profile.apiStyle.pattern === "trpc") {
    rules.push(
      "- Convert REST endpoints to tRPC procedures (query, mutation)",
      "- Use tRPC router pattern"
    );
  }

  // Naming convention rules
  if (profile.namingConventions.files) {
    rules.push(
      `- Use ${profile.namingConventions.files} for all new file names`
    );
  }

  // Auth rules
  if (profile.auth.strategies.length > 0) {
    rules.push(
      `- Use the project's existing auth approach (${profile.auth.strategies.join(", ")}) instead of inventing a new one`
    );
  }

  // Existing models
  if (profile.existingModels.length > 0) {
    const modelNames = profile.existingModels.map((m) => m.name).join(", ");
    rules.push(
      `- Reference existing models (${modelNames}) by their current names — do not rename them`,
      "- Only define NEW models for entities not already in the codebase"
    );
  }

  // Validation
  if (profile.middleware.validationLibrary) {
    rules.push(
      `- Use ${profile.middleware.validationLibrary} for request validation schemas`
    );
  }

  // Versioning
  if (profile.apiStyle.versioned) {
    rules.push(
      "- Follow the existing API versioning pattern for new endpoints"
    );
  }

  return `## Revision Instructions

Revise the original specification to match this codebase's patterns. Specific rules:

${rules.length > 0 ? rules.join("\n") : "- Adapt the spec to use the project's detected conventions."}

**Critical constraints:**
- Preserve ALL functional requirements from the original spec — do NOT remove features
- Keep the same section structure (Data Models, API Endpoints, etc.)
- Output the full revised specification in Markdown format — no preamble or meta-commentary`;
}
