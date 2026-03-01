export interface GeneratorOptions {
  model: string;
  maxTokens: number;
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 16000,
};
