import type { FigmaRestClient } from "../figma/rest-client.js";
import type { FigmaNode } from "../figma/types.js";
import { extractFrame } from "./structure-extractor.js";
import type {
  DesignAnalysis,
  PageAnalysis,
  ComponentInfo,
  InferredEntity,
  NavigationItem,
  ScreenType,
} from "./types.js";

export class DesignAnalyzer {
  constructor(private client: FigmaRestClient) {}

  async analyze(fileKey: string, nodeId?: string): Promise<DesignAnalysis> {
    if (nodeId) {
      return this.analyzeNode(fileKey, nodeId);
    }

    // 1. Shallow fetch for file overview (one API call)
    const file = await this.client.getFile(fileKey, 1);
    const fileName = file.name ?? "Untitled";

    const pages = file.document?.children;
    if (!pages || pages.length === 0) {
      throw new Error("Figma file appears to be empty or inaccessible.");
    }

    const components = this.extractComponents(file.components);

    // 2. Batch fetch all pages in one API call
    const pageIds = pages.map((p) => p.id);
    const nodesMap = await this.client.getNodes(fileKey, pageIds);

    const pageAnalyses: PageAnalysis[] = [];
    for (const page of pages) {
      const fullNode = nodesMap[page.id]?.document ?? page;
      const children = fullNode.children ?? [];
      const frames = children
        .filter(
          (child) =>
            child.type === "FRAME" ||
            child.type === "COMPONENT" ||
            child.type === "COMPONENT_SET" ||
            child.type === "SECTION"
        )
        .map((frame) => extractFrame(frame));

      pageAnalyses.push({
        id: fullNode.id,
        name: fullNode.name,
        frames,
      });
    }

    return this.buildAnalysis(fileName, pageAnalyses, components);
  }

  private async analyzeNode(
    fileKey: string,
    nodeId: string
  ): Promise<DesignAnalysis> {
    // Single API call for the specific node
    const nodesMap = await this.client.getNodes(fileKey, [nodeId]);
    const entry = nodesMap[nodeId];

    if (!entry) {
      throw new Error(`Node ${nodeId} not found in file.`);
    }

    const rootNode = entry.document;

    // Also get file-level metadata for the file name
    const file = await this.client.getFile(fileKey, 1);
    const fileName = file.name ?? "Untitled";
    const components = this.extractComponents(file.components);

    // If the node itself has child frames, treat each as a screen
    const children = rootNode.children ?? [];
    const frameNodes =
      children.length > 0
        ? children.filter(
            (c) =>
              c.type === "FRAME" ||
              c.type === "COMPONENT" ||
              c.type === "COMPONENT_SET" ||
              c.type === "SECTION"
          )
        : [rootNode];

    const frames = frameNodes.map((f) => extractFrame(f));

    const pageAnalysis: PageAnalysis = {
      id: rootNode.id,
      name: rootNode.name,
      frames,
    };

    return this.buildAnalysis(fileName, [pageAnalysis], components);
  }

  private extractComponents(
    raw: Record<string, { key: string; name: string; description: string }> | undefined
  ): ComponentInfo[] {
    if (!raw) return [];
    return Object.values(raw).map((c) => ({
      name: c.name,
      description: c.description ?? "",
      key: c.key,
    }));
  }

  private buildAnalysis(
    fileName: string,
    pages: PageAnalysis[],
    components: ComponentInfo[]
  ): DesignAnalysis {
    const allEntities: InferredEntity[] = [];
    const allNavigation: NavigationItem[] = [];
    const screenTypes = new Set<ScreenType>();

    for (const page of pages) {
      for (const frame of page.frames) {
        screenTypes.add(frame.screenType);
        allEntities.push(...frame.entities);
        allNavigation.push(...frame.navigation);
      }
    }

    // Deduplicate entities by name, merging fields
    const entityMap = new Map<string, InferredEntity>();
    for (const entity of allEntities) {
      const existing = entityMap.get(entity.name);
      if (existing) {
        const mergedFields = [
          ...new Set([...existing.fields, ...entity.fields]),
        ];
        entityMap.set(entity.name, {
          ...existing,
          fields: mergedFields,
          source: `${existing.source}; ${entity.source}`,
        });
      } else {
        entityMap.set(entity.name, { ...entity });
      }
    }

    // Deduplicate navigation
    const navSet = new Set<string>();
    const uniqueNav = allNavigation.filter((n) => {
      if (navSet.has(n.label)) return false;
      navSet.add(n.label);
      return true;
    });

    return {
      fileName,
      pages,
      components,
      allEntities: [...entityMap.values()],
      allNavigation: uniqueNav,
      screenTypes: [...screenTypes],
    };
  }
}
