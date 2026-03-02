import Anthropic from "@anthropic-ai/sdk";
import type { DesignAnalysis } from "../analyzer/types.js";
import { buildPrompt } from "./prompt-builder.js";
import { DEFAULT_GENERATOR_OPTIONS, type GeneratorOptions } from "./types.js";

export class SpecGenerator {
  private anthropic: Anthropic;
  private options: GeneratorOptions;

  constructor(apiKey: string, options?: Partial<GeneratorOptions>) {
    this.anthropic = new Anthropic({ apiKey });
    this.options = { ...DEFAULT_GENERATOR_OPTIONS, ...options };
  }

  async generate(analysis: DesignAnalysis, prdContent?: string): Promise<string> {
    const prompt = buildPrompt(analysis, prdContent);

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
        "You are a senior backend architect. You analyze UI designs and produce comprehensive, production-ready backend technical specifications. Output only the specification in Markdown format — no preamble or meta-commentary.",
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (textBlocks.length === 0) {
      throw new Error("Claude returned no text content.");
    }

    return textBlocks.map((b) => b.text).join("\n");
  }
}
