export interface LanguageInfo {
  primary: "typescript" | "javascript";
  nodeVersion: string | null;
  strictMode: boolean;
  moduleSystem: "esm" | "commonjs";
}

export interface FrameworkInfo {
  name: string | null;
  version: string | null;
}

export interface DatabaseInfo {
  orm: string | null;
  ormVersion: string | null;
  databaseType: string | null;
  schemaSample: string | null;
}

export interface AuthInfo {
  strategies: string[];
  packages: string[];
}

export interface FolderStructure {
  sourceRoot: string | null;
  directories: string[];
  pattern: string | null;
}

export interface NamingConventions {
  files: string | null;
  variables: string | null;
}

export interface ExistingModel {
  name: string;
  source: string;
  fields: string[];
}

export interface ApiStyleInfo {
  pattern: string | null;
  routeSamples: string[];
  versioned: boolean;
}

export interface MiddlewareInfo {
  detected: string[];
  hasErrorHandler: boolean;
  validationLibrary: string | null;
}

export interface CodebaseProfile {
  language: LanguageInfo;
  framework: FrameworkInfo;
  database: DatabaseInfo;
  auth: AuthInfo;
  folderStructure: FolderStructure;
  namingConventions: NamingConventions;
  existingModels: ExistingModel[];
  apiStyle: ApiStyleInfo;
  middleware: MiddlewareInfo;
}
