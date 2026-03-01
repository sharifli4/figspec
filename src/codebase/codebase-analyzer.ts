import { join } from "node:path";
import { access } from "node:fs/promises";
import type { CodebaseProfile } from "./types.js";
import { detectLanguage } from "./detectors/language.js";
import { detectFramework } from "./detectors/framework.js";
import { detectDatabase } from "./detectors/database.js";
import { detectAuth } from "./detectors/auth.js";
import { detectStructure } from "./detectors/structure.js";
import { detectNaming } from "./detectors/naming.js";
import { detectExistingModels } from "./detectors/models.js";
import { detectApiStyle } from "./detectors/api-style.js";
import { detectMiddleware } from "./detectors/middleware.js";

export class CodebaseAnalyzer {
  async analyze(projectPath: string): Promise<CodebaseProfile> {
    // Validate path exists and has package.json
    try {
      await access(join(projectPath, "package.json"));
    } catch {
      throw new Error(
        `No package.json found at ${projectPath}. The --project path must point to a Node.js project root.`
      );
    }

    // Run independent detectors in parallel
    const [language, framework, database, auth, folderStructure, namingConventions, apiStyle, middleware] =
      await Promise.all([
        detectLanguage(projectPath),
        detectFramework(projectPath),
        detectDatabase(projectPath),
        detectAuth(projectPath),
        detectStructure(projectPath),
        detectNaming(projectPath),
        detectApiStyle(projectPath),
        detectMiddleware(projectPath),
      ]);

    // Models detection depends on ORM result
    const existingModels = await detectExistingModels(projectPath, database.orm);

    return {
      language,
      framework,
      database,
      auth,
      folderStructure,
      namingConventions,
      existingModels,
      apiStyle,
      middleware,
    };
  }
}
