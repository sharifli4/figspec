export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  characters?: string; // text content
  componentId?: string;
  componentProperties?: Record<string, unknown>;
  style?: Record<string, unknown>;
  fills?: unknown[];
  strokes?: unknown[];
  constraints?: { vertical: string; horizontal: string };
  layoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible?: boolean;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: string;
  description: string;
}

export interface FigmaFileResponse {
  name: string;
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
  version: string;
  lastModified: string;
}

export interface FigmaFileNodesResponse {
  nodes: Record<
    string,
    {
      document: FigmaNode;
      components: Record<string, FigmaComponent>;
      styles: Record<string, FigmaStyle>;
    }
  >;
}
