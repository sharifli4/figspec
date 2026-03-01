import type {
  FigmaFileResponse,
  FigmaFileNodesResponse,
  FigmaNode,
} from "./types.js";
import { getCached, setCache } from "./cache.js";

const BASE_URL = "https://api.figma.com";
const MAX_RETRIES = 6;
const BACKOFF_BASE_MS = 10000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FigmaRestClient {
  private lastRequestTime = 0;
  private useCache: boolean;

  constructor(
    private apiKey: string,
    private minRequestGap = 3000,
    options?: { cache?: boolean }
  ) {
    this.useCache = options?.cache ?? true;
  }

  /**
   * GET /v1/files/:key — returns file metadata + top-level page nodes.
   * Use depth to limit traversal (depth=1 gives pages without children).
   */
  async getFile(fileKey: string, depth?: number): Promise<FigmaFileResponse> {
    const params = new URLSearchParams();
    if (depth !== undefined) params.set("depth", String(depth));
    const qs = params.toString();
    const url = `${BASE_URL}/v1/files/${fileKey}${qs ? `?${qs}` : ""}`;

    const cacheKey = ["getFile", fileKey, String(depth ?? "")];
    if (this.useCache) {
      const cached = await getCached(cacheKey);
      if (cached) return cached as FigmaFileResponse;
    }

    const data = (await this.request(url)) as FigmaFileResponse;

    if (this.useCache) {
      await setCache(cacheKey, data);
    }
    return data;
  }

  /**
   * GET /v1/files/:key/nodes?ids=X,Y,Z — batch fetch specific nodes.
   * Returns a map of nodeId -> { document, components, styles }.
   */
  async getNodes(
    fileKey: string,
    nodeIds: string[],
    depth?: number
  ): Promise<Record<string, { document: FigmaNode }>> {
    const params = new URLSearchParams();
    params.set("ids", nodeIds.join(","));
    if (depth !== undefined) params.set("depth", String(depth));
    const url = `${BASE_URL}/v1/files/${fileKey}/nodes?${params.toString()}`;

    const cacheKey = [
      "getNodes",
      fileKey,
      nodeIds.sort().join(","),
      String(depth ?? ""),
    ];
    if (this.useCache) {
      const cached = await getCached(cacheKey);
      if (cached) return cached as Record<string, { document: FigmaNode }>;
    }

    const data = (await this.request(url)) as FigmaFileNodesResponse;
    const result: Record<string, { document: FigmaNode }> = {};

    for (const [id, node] of Object.entries(data.nodes)) {
      if (node) {
        result[id] = { document: node.document };
      }
    }

    if (this.useCache) {
      await setCache(cacheKey, result);
    }
    return result;
  }

  private async request(url: string): Promise<unknown> {
    // Throttle
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestGap) {
      await sleep(this.minRequestGap - elapsed);
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      this.lastRequestTime = Date.now();

      const res = await fetch(url, {
        headers: { "X-FIGMA-TOKEN": this.apiKey },
      });

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = res.headers.get("retry-after");
        const backoff = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BACKOFF_BASE_MS * Math.pow(2, attempt);
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Figma API ${res.status}: ${res.statusText}${body ? ` — ${body}` : ""}`
        );
      }

      return res.json();
    }

    throw new Error(`Figma API request failed after ${MAX_RETRIES} retries`);
  }
}
