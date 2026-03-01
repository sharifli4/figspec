import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export class FigmaMcpClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private availableTools: Tool[] = [];

  constructor(private figmaApiKey: string) {
    this.client = new Client({
      name: "design-spec",
      version: "1.0.0",
    });
  }

  async connect(): Promise<void> {
    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "figma-developer-mcp", "--stdio"],
      env: {
        ...process.env,
        FIGMA_API_KEY: this.figmaApiKey,
      },
    });

    await this.client.connect(this.transport);

    const { tools } = await this.client.listTools();
    this.availableTools = tools;
  }

  getAvailableTools(): Tool[] {
    return this.availableTools;
  }

  hasTool(name: string): boolean {
    return this.availableTools.some((t) => t.name === name);
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const result = await this.client.callTool({ name, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }>;

    if (result.isError) {
      const text =
        content
          .filter((c) => c.type === "text" && c.text)
          .map((c) => c.text)
          .join("\n") || "Unknown error";
      throw new Error(`MCP tool "${name}" failed: ${text}`);
    }

    const textParts = content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!);

    if (textParts.length === 0) {
      return null;
    }

    return textParts.join("\n");
  }

  async getFigmaData(
    fileKey: string,
    nodeId?: string,
    depth?: number
  ): Promise<unknown> {
    const args: Record<string, unknown> = { fileKey };
    if (nodeId) args.nodeId = nodeId;
    if (depth !== undefined) args.depth = depth;
    return this.callTool("get_figma_data", args);
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
    } catch {
      // Best-effort cleanup
    }
    try {
      await this.transport?.close();
    } catch {
      // Best-effort cleanup
    }
  }
}
