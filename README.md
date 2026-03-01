# design-spec

Generate backend technical specifications from Figma designs using MCP and Claude.

Optionally point it at your existing codebase so the generated spec matches your framework, ORM, naming conventions, and project structure.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in your `.env`:

```
FIGMA_API_KEY=your-figma-personal-access-token
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Build:

```bash
npm run build
```

## Usage

### Basic (generic spec)

```bash
npx design-spec <figma-url>
```

This analyzes the Figma design and generates a generic backend spec with SQL DDL and REST endpoints.

### With codebase matching

```bash
npx design-spec <figma-url> --project /path/to/your/backend
```

This runs two passes:
1. **Pass 1** -- Generate a raw spec from the Figma design
2. **Pass 2** -- Analyze your codebase and revise the spec to match its patterns

The `--project` path must point to a Node.js project root (directory with `package.json`).

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <path>` | Output file path | `./backend-spec.md` |
| `--model <model>` | Claude model to use | `claude-sonnet-4-20250514` |
| `-p, --project <path>` | Project directory to match spec against | _(none)_ |

### Examples

```bash
# Generate spec to a custom file
npx design-spec "https://www.figma.com/design/abc123/MyApp" -o spec.md

# Match spec to a NestJS + Prisma project
npx design-spec "https://www.figma.com/design/abc123/MyApp" -p ../my-nestjs-app

# Match spec to the current directory
npx design-spec "https://www.figma.com/design/abc123/MyApp" -p .

# Use a different model
npx design-spec "https://www.figma.com/design/abc123/MyApp" --model claude-opus-4-20250514
```

### Development mode

Run directly without building:

```bash
npm run dev -- "https://www.figma.com/design/abc123/MyApp" -p ../my-project
```

## What codebase analysis detects

When you pass `--project`, the tool scans your project and detects:

- **Framework** -- Express, Fastify, NestJS, Hono, Koa
- **ORM & database** -- Prisma, Drizzle, TypeORM, Mongoose, Sequelize, Knex (+ PostgreSQL, MySQL, SQLite, MongoDB)
- **Auth** -- JWT, Passport, sessions, OAuth providers, Next-Auth, Lucia, Supabase, Firebase
- **Language** -- TypeScript/JavaScript, ESM/CommonJS, strict mode, Node version
- **Project structure** -- source root, folder layout pattern (MVC, layered, feature-based, NestJS modular)
- **Naming conventions** -- file naming (kebab-case, camelCase, etc.) and variable naming from code samples
- **Existing models** -- entity names and fields extracted from Prisma schemas, Drizzle tables, TypeORM entities, or Mongoose models
- **API style** -- REST, GraphQL, or tRPC, route samples, API versioning
- **Middleware** -- CORS, Helmet, rate limiting, validation library (Zod, Joi, class-validator)

The revision step then rewrites the spec accordingly. For example:
- Prisma project -> SQL DDL becomes Prisma schema syntax
- NestJS project -> endpoints become controllers with decorators and DTOs
- Mongoose project -> relational schemas become Mongoose Schema definitions
- Existing models are referenced by name instead of being redefined
