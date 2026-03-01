export enum ScreenType {
  LOGIN = "LOGIN",
  REGISTRATION = "REGISTRATION",
  DASHBOARD = "DASHBOARD",
  LIST = "LIST",
  DETAIL = "DETAIL",
  FORM = "FORM",
  SETTINGS = "SETTINGS",
  PROFILE = "PROFILE",
  SEARCH = "SEARCH",
  LANDING = "LANDING",
  UNKNOWN = "UNKNOWN",
}

export enum ElementType {
  TEXT_INPUT = "TEXT_INPUT",
  PASSWORD_INPUT = "PASSWORD_INPUT",
  EMAIL_INPUT = "EMAIL_INPUT",
  TEXTAREA = "TEXTAREA",
  SELECT = "SELECT",
  CHECKBOX = "CHECKBOX",
  RADIO = "RADIO",
  TOGGLE = "TOGGLE",
  BUTTON = "BUTTON",
  SUBMIT_BUTTON = "SUBMIT_BUTTON",
  LINK = "LINK",
  TABLE = "TABLE",
  TABLE_ROW = "TABLE_ROW",
  TABLE_HEADER = "TABLE_HEADER",
  CARD = "CARD",
  LIST_ITEM = "LIST_ITEM",
  IMAGE = "IMAGE",
  AVATAR = "AVATAR",
  ICON = "ICON",
  NAV_ITEM = "NAV_ITEM",
  SEARCH_BAR = "SEARCH_BAR",
  PAGINATION = "PAGINATION",
  MODAL = "MODAL",
  TAB = "TAB",
  BADGE = "BADGE",
  TAG = "TAG",
  CHART = "CHART",
  STAT_CARD = "STAT_CARD",
  FILE_UPLOAD = "FILE_UPLOAD",
  DATE_PICKER = "DATE_PICKER",
  UNKNOWN = "UNKNOWN",
}

export interface UIElement {
  type: ElementType;
  name: string;
  label?: string;
  nodeType: string;
}

export interface InferredEntity {
  name: string;
  fields: string[];
  source: string; // which screen/element it was inferred from
}

export interface NavigationItem {
  label: string;
  target?: string;
}

export interface FrameAnalysis {
  id: string;
  name: string;
  screenType: ScreenType;
  elements: UIElement[];
  entities: InferredEntity[];
  navigation: NavigationItem[];
  textContent: string[];
}

export interface DesignAnalysis {
  fileName: string;
  pages: PageAnalysis[];
  components: ComponentInfo[];
  allEntities: InferredEntity[];
  allNavigation: NavigationItem[];
  screenTypes: ScreenType[];
}

export interface PageAnalysis {
  id: string;
  name: string;
  frames: FrameAnalysis[];
}

export interface ComponentInfo {
  name: string;
  description: string;
  key: string;
}
