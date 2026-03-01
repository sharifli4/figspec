import type { FigmaNode } from "../figma/types.js";
import {
  ScreenType,
  ElementType,
  type UIElement,
  type InferredEntity,
  type NavigationItem,
  type FrameAnalysis,
} from "./types.js";

const SCREEN_PATTERNS: [RegExp, ScreenType][] = [
  [/\b(log\s*in|sign\s*in|signin)\b/i, ScreenType.LOGIN],
  [/\b(sign\s*up|register|registration|create\s*account)\b/i, ScreenType.REGISTRATION],
  [/\b(dashboard|overview|home|main)\b/i, ScreenType.DASHBOARD],
  [/\b(list|table|index|all|browse)\b/i, ScreenType.LIST],
  [/\b(detail|view|show|single|info)\b/i, ScreenType.DETAIL],
  [/\b(form|create|edit|new|add|update)\b/i, ScreenType.FORM],
  [/\b(setting|preference|config)\b/i, ScreenType.SETTINGS],
  [/\b(profile|account|user\s*info)\b/i, ScreenType.PROFILE],
  [/\b(search|find|filter|explore)\b/i, ScreenType.SEARCH],
  [/\b(landing|welcome|hero|marketing)\b/i, ScreenType.LANDING],
];

const ELEMENT_PATTERNS: [RegExp, ElementType][] = [
  [/\b(password|passwd)\b/i, ElementType.PASSWORD_INPUT],
  [/\b(email)\b/i, ElementType.EMAIL_INPUT],
  [/\b(input|text\s*field|text\s*box|field)\b/i, ElementType.TEXT_INPUT],
  [/\b(textarea|text\s*area|multiline|description\s*input)\b/i, ElementType.TEXTAREA],
  [/\b(select|dropdown|combo\s*box|picker)\b/i, ElementType.SELECT],
  [/\b(checkbox|check\s*box)\b/i, ElementType.CHECKBOX],
  [/\b(radio)\b/i, ElementType.RADIO],
  [/\b(toggle|switch)\b/i, ElementType.TOGGLE],
  [/\b(submit|save|confirm|create|update|send)\b/i, ElementType.SUBMIT_BUTTON],
  [/\b(button|btn|cta)\b/i, ElementType.BUTTON],
  [/\b(link|anchor|href)\b/i, ElementType.LINK],
  [/\b(table)\b/i, ElementType.TABLE],
  [/\b(row|tr)\b/i, ElementType.TABLE_ROW],
  [/\b(header|th|column\s*head)\b/i, ElementType.TABLE_HEADER],
  [/\b(card)\b/i, ElementType.CARD],
  [/\b(list\s*item|li)\b/i, ElementType.LIST_ITEM],
  [/\b(avatar)\b/i, ElementType.AVATAR],
  [/\b(image|img|photo|thumbnail)\b/i, ElementType.IMAGE],
  [/\b(icon)\b/i, ElementType.ICON],
  [/\b(nav|menu\s*item|sidebar\s*item|tab\s*bar\s*item)\b/i, ElementType.NAV_ITEM],
  [/\b(search\s*bar|search\s*input|search\s*field)\b/i, ElementType.SEARCH_BAR],
  [/\b(pagination|pager|page\s*nav)\b/i, ElementType.PAGINATION],
  [/\b(modal|dialog|popup|overlay)\b/i, ElementType.MODAL],
  [/\b(tab)\b/i, ElementType.TAB],
  [/\b(badge)\b/i, ElementType.BADGE],
  [/\b(tag|chip|pill)\b/i, ElementType.TAG],
  [/\b(chart|graph|plot|visualization)\b/i, ElementType.CHART],
  [/\b(stat|metric|kpi)\b/i, ElementType.STAT_CARD],
  [/\b(upload|file\s*input|attach)\b/i, ElementType.FILE_UPLOAD],
  [/\b(date|calendar)\b/i, ElementType.DATE_PICKER],
];

export function classifyScreen(name: string): ScreenType {
  for (const [pattern, type] of SCREEN_PATTERNS) {
    if (pattern.test(name)) return type;
  }
  return ScreenType.UNKNOWN;
}

function classifyElement(name: string): ElementType {
  for (const [pattern, type] of ELEMENT_PATTERNS) {
    if (pattern.test(name)) return type;
  }
  return ElementType.UNKNOWN;
}

function isInteractive(node: FigmaNode): boolean {
  const interactiveTypes = [
    "INSTANCE",
    "COMPONENT",
    "COMPONENT_SET",
    "FRAME",
    "GROUP",
  ];
  return interactiveTypes.includes(node.type);
}

export function extractFrame(node: FigmaNode): FrameAnalysis {
  const elements: UIElement[] = [];
  const textContent: string[] = [];
  const navigation: NavigationItem[] = [];
  const fieldLabels: string[] = [];
  const tableHeaders: string[] = [];

  function walkNode(n: FigmaNode, parentContext?: string): void {
    if (n.visible === false) return;

    const lowerName = n.name.toLowerCase();

    // Collect text content
    if (n.type === "TEXT" && n.characters) {
      textContent.push(n.characters);
    }

    // Classify elements by name
    if (isInteractive(n)) {
      const elType = classifyElement(n.name);
      if (elType !== ElementType.UNKNOWN) {
        elements.push({
          type: elType,
          name: n.name,
          label: extractLabel(n),
          nodeType: n.type,
        });
      }

      // Detect nav items
      if (/nav|sidebar|menu|tab\s*bar/i.test(parentContext ?? "")) {
        const label = extractTextFromChildren(n);
        if (label) {
          navigation.push({ label, target: lowerName });
        }
      }
    }

    // Text nodes inside forms are likely labels
    if (
      n.type === "TEXT" &&
      n.characters &&
      /form|input|field/i.test(parentContext ?? "")
    ) {
      fieldLabels.push(n.characters);
    }

    // Table headers
    if (
      n.type === "TEXT" &&
      n.characters &&
      /header|th|column/i.test(parentContext ?? "")
    ) {
      tableHeaders.push(n.characters);
    }

    // Recurse into children
    if (n.children) {
      const ctx = /nav|sidebar|menu|tab\s*bar|form|table|header/i.test(
        lowerName
      )
        ? lowerName
        : parentContext;
      for (const child of n.children) {
        walkNode(child, ctx);
      }
    }
  }

  walkNode(node);

  const screenType = classifyScreen(node.name);
  const entities = inferEntities(node.name, screenType, fieldLabels, tableHeaders);

  return {
    id: node.id,
    name: node.name,
    screenType,
    elements,
    entities,
    navigation,
    textContent,
  };
}

function extractLabel(node: FigmaNode): string | undefined {
  if (node.characters) return node.characters;
  if (!node.children) return undefined;
  return extractTextFromChildren(node);
}

function extractTextFromChildren(node: FigmaNode): string | undefined {
  if (!node.children) return undefined;
  for (const child of node.children) {
    if (child.type === "TEXT" && child.characters) {
      return child.characters;
    }
    const nested = extractTextFromChildren(child);
    if (nested) return nested;
  }
  return undefined;
}

function inferEntities(
  frameName: string,
  screenType: ScreenType,
  fieldLabels: string[],
  tableHeaders: string[]
): InferredEntity[] {
  const entities: InferredEntity[] = [];

  // Try to infer entity name from frame name
  const entityName = extractEntityName(frameName);

  if (screenType === ScreenType.FORM && fieldLabels.length > 0) {
    entities.push({
      name: entityName || "FormEntity",
      fields: fieldLabels.map(normalizeFieldName),
      source: `form: ${frameName}`,
    });
  }

  if (
    (screenType === ScreenType.LIST || screenType === ScreenType.DETAIL) &&
    tableHeaders.length > 0
  ) {
    entities.push({
      name: entityName || "ListEntity",
      fields: tableHeaders.map(normalizeFieldName),
      source: `table/list: ${frameName}`,
    });
  }

  // Auth entities
  if (
    screenType === ScreenType.LOGIN ||
    screenType === ScreenType.REGISTRATION
  ) {
    const fields = fieldLabels.length > 0 ? fieldLabels.map(normalizeFieldName) : ["email", "password"];
    entities.push({
      name: "User",
      fields,
      source: `auth: ${frameName}`,
    });
  }

  return entities;
}

function extractEntityName(frameName: string): string | undefined {
  // Remove screen type keywords and common prefixes
  const cleaned = frameName
    .replace(
      /\b(screen|page|view|list|detail|form|create|edit|new|add|update|dashboard|all|browse|index)\b/gi,
      ""
    )
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim();

  if (cleaned.length === 0) return undefined;

  // PascalCase the remaining words
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function normalizeFieldName(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}
