import { ScreenType, type DesignAnalysis, type FrameAnalysis } from "../analyzer/types.js";

export function buildPrompt(analysis: DesignAnalysis): string {
  const sections: string[] = [];

  sections.push(buildHeader(analysis));
  sections.push(buildScreenSummary(analysis));
  sections.push(buildEntitySummary(analysis));
  sections.push(buildNavigationSummary(analysis));
  sections.push(buildComponentSummary(analysis));
  sections.push(buildDetailedFrames(analysis));
  sections.push(buildInstructions(analysis));

  return sections.join("\n\n");
}

function buildHeader(analysis: DesignAnalysis): string {
  return `# Design Analysis for "${analysis.fileName}"

You are analyzing a Figma design to generate a comprehensive backend technical specification.
Below is the structured data extracted from the design file.`;
}

function buildScreenSummary(analysis: DesignAnalysis): string {
  const types = analysis.screenTypes.filter((t) => t !== ScreenType.UNKNOWN);
  if (types.length === 0) {
    return "## Detected Screen Types\nNo specific screen types were confidently identified. Analyze the frame details below to infer the application structure.";
  }
  return `## Detected Screen Types
${types.map((t) => `- ${t}`).join("\n")}`;
}

function buildEntitySummary(analysis: DesignAnalysis): string {
  if (analysis.allEntities.length === 0) {
    return "## Inferred Entities\nNo entities were directly inferred from form labels or table headers. Use the frame details below to identify data entities.";
  }

  const lines = analysis.allEntities.map(
    (e) =>
      `### ${e.name}\n- **Fields**: ${e.fields.join(", ")}\n- **Source**: ${e.source}`
  );
  return `## Inferred Entities\n${lines.join("\n\n")}`;
}

function buildNavigationSummary(analysis: DesignAnalysis): string {
  if (analysis.allNavigation.length === 0) return "";
  return `## Navigation Structure
${analysis.allNavigation.map((n) => `- ${n.label}${n.target ? ` → ${n.target}` : ""}`).join("\n")}`;
}

function buildComponentSummary(analysis: DesignAnalysis): string {
  if (analysis.components.length === 0) return "";
  const items = analysis.components
    .slice(0, 30) // Limit to avoid prompt bloat
    .map((c) => `- **${c.name}**${c.description ? `: ${c.description}` : ""}`);
  return `## Design Components (${analysis.components.length} total)\n${items.join("\n")}`;
}

function buildDetailedFrames(analysis: DesignAnalysis): string {
  const frameSections: string[] = [];

  for (const page of analysis.pages) {
    for (const frame of page.frames) {
      frameSections.push(formatFrame(frame, page.name));
    }
  }

  if (frameSections.length === 0) {
    return "## Frame Details\nNo frames found in the design.";
  }

  return `## Frame Details\n${frameSections.join("\n\n")}`;
}

function formatFrame(frame: FrameAnalysis, pageName: string): string {
  const lines: string[] = [];
  lines.push(`### ${frame.name} (${pageName})`);
  lines.push(`- **Screen Type**: ${frame.screenType}`);

  if (frame.elements.length > 0) {
    lines.push(`- **UI Elements** (${frame.elements.length}):`);
    for (const el of frame.elements.slice(0, 20)) {
      lines.push(
        `  - ${el.type}: "${el.name}"${el.label ? ` [label: "${el.label}"]` : ""}`
      );
    }
    if (frame.elements.length > 20) {
      lines.push(`  - ... and ${frame.elements.length - 20} more`);
    }
  }

  if (frame.textContent.length > 0) {
    const relevant = frame.textContent
      .filter((t) => t.length > 1 && t.length < 100)
      .slice(0, 15);
    if (relevant.length > 0) {
      lines.push(`- **Text Content**: ${relevant.map((t) => `"${t}"`).join(", ")}`);
    }
  }

  return lines.join("\n");
}

function buildInstructions(analysis: DesignAnalysis): string {
  const hasAuth =
    analysis.screenTypes.includes(ScreenType.LOGIN) ||
    analysis.screenTypes.includes(ScreenType.REGISTRATION);
  const hasList = analysis.screenTypes.includes(ScreenType.LIST);
  const hasForm = analysis.screenTypes.includes(ScreenType.FORM);
  const hasDashboard = analysis.screenTypes.includes(ScreenType.DASHBOARD);

  const specSections: string[] = [
    "1. **Data Models** — Define all entities with their fields, types (string, number, boolean, date, enum, relation), and relationships (1:1, 1:N, M:N). Include standard fields (id, createdAt, updatedAt).",
    "2. **API Endpoints** — RESTful endpoints for each entity (CRUD + any special operations). Include HTTP method, path, request body schema, response schema, query params for filtering/sorting/pagination.",
    "3. **Database Schema** — PostgreSQL DDL statements. Include tables, columns with types, primary keys, foreign keys, indexes, and constraints. Add useful indexes for common query patterns.",
  ];

  if (hasAuth) {
    specSections.push(
      "4. **Authentication & Authorization** — Auth flow (JWT/session), login/register/logout endpoints, password hashing, token refresh, role-based access control if multiple user types are apparent."
    );
  }

  specSections.push(
    `${hasAuth ? "5" : "4"}. **Business Logic** — Key workflows, validation rules, state machines (e.g., order statuses), computed fields, and side effects (e.g., send email on registration).`
  );

  const focusAreas: string[] = [];
  if (hasList) focusAreas.push("pagination and filtering for list views");
  if (hasForm) focusAreas.push("validation rules inferred from form fields");
  if (hasDashboard)
    focusAreas.push("aggregation queries for dashboard statistics");
  if (hasAuth) focusAreas.push("secure authentication flow");

  return `---

## Generation Instructions

Based on the design analysis above, generate a **complete backend technical specification** with these sections:

${specSections.join("\n")}

${focusAreas.length > 0 ? `**Special focus areas** based on detected patterns: ${focusAreas.join(", ")}.` : ""}

**Guidelines:**
- Infer field types from context (e.g., "email" → string with email validation, "price" → decimal, "status" → enum)
- If entity names are unclear, use reasonable names based on the UI context
- Include timestamps (createdAt, updatedAt) and soft-delete (deletedAt) on all entities
- Use UUID for primary keys
- Add appropriate indexes for foreign keys and commonly filtered fields
- Format the entire output as clean, well-structured Markdown`;
}
