export interface ParsedFigmaUrl {
  fileKey: string;
  nodeId?: string;
}

const FIGMA_URL_RE =
  /figma\.com\/(?:design|file|board)\/([a-zA-Z0-9]+)(?:\/[^?]*)?/;

const NODE_ID_RE = /node-id=([^&]+)/;

export function parseFigmaUrl(url: string): ParsedFigmaUrl {
  const fileMatch = url.match(FIGMA_URL_RE);
  if (!fileMatch) {
    throw new Error(
      `Invalid Figma URL: ${url}\nExpected format: https://www.figma.com/design/FILE_KEY/...`
    );
  }

  const fileKey = fileMatch[1];
  let nodeId: string | undefined;

  const nodeMatch = url.match(NODE_ID_RE);
  if (nodeMatch) {
    // Figma URLs use "0-1" but the API expects "0:1"
    nodeId = decodeURIComponent(nodeMatch[1]).replace(/-/g, ":");
  }

  return { fileKey, nodeId };
}
