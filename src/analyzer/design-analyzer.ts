import { parse as parseYaml } from "yaml";
import type { FigmaMcpClient } from "../figma/client.js";
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

// Shape of the YAML returned by figma-developer-mcp's get_figma_data tool
interface McpYamlResult {
  metadata?: {
    name?: string;
    components?: Record<
      string,
      { id: string; name: string; key: string; componentSetId?: string }
    >;
  };
  nodes?: McpYamlNode[];
  globalVars?: unknown;
}

interface McpYamlNode {
  id: string;
  name: string;
  type: string;
  text?: string;
  children?: McpYamlNode[];
  componentId?: string;
  layout?: string;
  fills?: string;
  visible?: boolean;
}

function mcpNodeToFigmaNode(node: McpYamlNode): FigmaNode {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    characters: node.text,
    componentId: node.componentId,
    visible: node.visible,
    children: node.children?.map(mcpNodeToFigmaNode),
  };
}

export class DesignAnalyzer {
  constructor(private client: FigmaMcpClient) {}

  async analyze(fileKey: string, nodeId?: string): Promise<DesignAnalysis> {
    if (nodeId) {
      return this.analyzeNode(fileKey, nodeId);
    }

    // Shallow fetch for file overview
    const overviewYaml = (await this.client.getFigmaData(
      fileKey,
      undefined,
      1
    )) as string;
    const overview = parseYaml(overviewYaml) as McpYamlResult;

    const fileName = overview?.metadata?.name ?? "Untitled";
    const topNodes = overview?.nodes;

    if (!topNodes || topNodes.length === 0) {
      throw new Error("Figma file appears to be empty or inaccessible.");
    }

    const components = this.extractComponents(overview);

    // The top-level nodes are pages. Deep-fetch each page.
    const pageAnalyses: PageAnalysis[] = [];
    for (const pageNode of topNodes) {
      const pageAnalysis = await this.analyzePage(fileKey, pageNode);
      pageAnalyses.push(pageAnalysis);
    }

    return this.buildAnalysis(fileName, pageAnalyses, components);
  }

  private async analyzePage(
    fileKey: string,
    shallowPage: McpYamlNode
  ): Promise<PageAnalysis> {
    let rootNode: FigmaNode;

    try {
      const yamlText = (await this.client.getFigmaData(
        fileKey,
        shallowPage.id
      )) as string;
      const parsed = parseYaml(yamlText) as McpYamlResult;
      const fullNode = parsed?.nodes?.[0];
      rootNode = fullNode
        ? mcpNodeToFigmaNode(fullNode)
        : mcpNodeToFigmaNode(shallowPage);
    } catch {
      rootNode = mcpNodeToFigmaNode(shallowPage);
    }

    const children = rootNode.children ?? [];
    const frames = children
      .filter(
        (child) =>
          child.type === "FRAME" ||
          child.type === "COMPONENT" ||
          child.type === "COMPONENT_SET" ||
          child.type === "SECTION"
      )
      .map((frame) => extractFrame(frame));

    return {
      id: rootNode.id,
      name: rootNode.name,
      frames,
    };
  }

  private async analyzeNode(
    fileKey: string,
    nodeId: string
  ): Promise<DesignAnalysis> {
    const yamlText = (await this.client.getFigmaData(
      fileKey,
      nodeId
    )) as string;
    const parsed = parseYaml(yamlText) as McpYamlResult;

    const fileName = parsed?.metadata?.name ?? "Untitled";
    const rootYamlNode = parsed?.nodes?.[0];

    if (!rootYamlNode) {
      throw new Error(`Node ${nodeId} not found in file.`);
    }

    const rootNode = mcpNodeToFigmaNode(rootYamlNode);
    const components = this.extractComponents(parsed);

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

  private extractComponents(parsed: McpYamlResult): ComponentInfo[] {
    const raw = parsed?.metadata?.components;
    if (!raw) return [];
    return Object.values(raw).map((c) => ({
      name: c.name,
      description: "",
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
