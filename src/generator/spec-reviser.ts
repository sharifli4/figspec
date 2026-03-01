import Anthropic from "@anthropic-ai/sdk";
import type { CodebaseProfile } from "../codebase/types.js";
import { buildRevisionPrompt } from "./revision-prompt-builder.js";
import { DEFAULT_GENERATOR_OPTIONS, type GeneratorOptions } from "./types.js";

export class SpecReviser {
  private anthropic: Anthropic;
  private options: GeneratorOptions;

  constructor(apiKey: string, options?: Partial<GeneratorOptions>) {
    this.anthropic = new Anthropic({ apiKey });
    this.options = { ...DEFAULT_GENERATOR_OPTIONS, ...options };
  }

  async revise(rawSpec: string, profile: CodebaseProfile): Promise<string> {
    const prompt = buildRevisionPrompt(rawSpec, profile);

    const response = await this.anthropic.messages.create({
      model: this.options.model,
      max_tokens: this.options.maxTokens,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      system:
        "You are a senior backend architect adapting a technical specification to match an existing codebase's patterns and conventions. Output only the revised specification in Markdown format — no preamble or meta-commentary.",
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (textBlocks.length === 0) {
      throw new Error("Claude returned no text content during spec revision.");
    }

    return textBlocks.map((b) => b.text).join("\n");
  }
}
