#!/usr/bin/env node

import { resolve } from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { loadConfig } from "./config.js";
import { parseFigmaUrl } from "./figma/url-parser.js";
import { FigmaRestClient } from "./figma/rest-client.js";
import { DesignAnalyzer } from "./analyzer/design-analyzer.js";
import { SpecGenerator } from "./generator/spec-generator.js";
import { SpecReviser } from "./generator/spec-reviser.js";
import { CodebaseAnalyzer } from "./codebase/codebase-analyzer.js";
import { writeSpec } from "./output/markdown-writer.js";
import { loadPrd, detectPrd } from "./prd/prd-loader.js";

const program = new Command();

program
  .name("design-spec")
  .description(
    "Generate backend technical specifications from Figma designs"
  )
  .version("1.0.0")
  .argument("<figma-url>", "Figma file URL to analyze")
  .option("-o, --output <path>", "Output file path", "./backend-spec.md")
  .option("--model <model>", "Claude model to use", "claude-sonnet-4-20250514")
  .option("-p, --project <path>", "Project directory to match spec against")
  .option("--prd <path>", "Path to a PRD file to cross-reference with the design")
  .option("--no-cache", "Skip local Figma API cache")
  .action(async (figmaUrl: string, options: { output: string; model: string; project?: string; prd?: string; cache: boolean }) => {
    try {
      // Load and validate config
      const config = loadConfig();

      // Parse Figma URL
      const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);
      console.log(
        chalk.blue(`\nFile key: ${fileKey}${nodeId ? `, Node: ${nodeId}` : ""}`)
      );

      // Create Figma REST client
      const connectSpinner = ora("Connecting to Figma API...").start();
      const figmaClient = new FigmaRestClient(config.FIGMA_API_KEY, 3000, {
        cache: options.cache,
      });
      connectSpinner.succeed("Figma REST client ready");

      // Analyze design
      const analyzeSpinner = ora("Analyzing design structure...").start();
      const analyzer = new DesignAnalyzer(figmaClient);
      const analysis = await analyzer.analyze(fileKey, nodeId);

      const frameCount = analysis.pages.reduce(
        (sum, p) => sum + p.frames.length,
        0
      );
      const entityCount = analysis.allEntities.length;
      analyzeSpinner.succeed(
        `Analyzed ${analysis.pages.length} pages, ${frameCount} frames, ${entityCount} entities`
      );

      // Load PRD — explicit --prd flag takes priority, otherwise auto-detect from project dir
      let prdContent: string | undefined;
      let prdFileName: string | undefined;
      let prdPath = options.prd;
      if (!prdPath && options.project) {
        prdPath = await detectPrd(resolve(options.project)) ?? undefined;
      }
      if (prdPath) {
        const prdSpinner = ora("Loading PRD...").start();
        const prd = await loadPrd(prdPath);
        prdContent = prd.content;
        prdFileName = prd.fileName;
        prdSpinner.succeed(`PRD loaded: ${chalk.cyan(prd.fileName)}${!options.prd ? " (auto-detected)" : ""}`);
      }

      // Generate spec
      const genSpinner = ora(
        `Generating backend specification with ${options.model}...`
      ).start();
      const generator = new SpecGenerator(config.ANTHROPIC_API_KEY, {
        model: options.model,
      });
      let spec = await generator.generate(analysis, prdContent);
      genSpinner.succeed("Backend specification generated");

      // Pass 2: Revise spec to match project codebase (if --project provided)
      if (options.project) {
        const projectPath = resolve(options.project);

        const analyzeCodebaseSpinner = ora("Analyzing project codebase...").start();
        const codebaseAnalyzer = new CodebaseAnalyzer();
        const profile = await codebaseAnalyzer.analyze(projectPath);

        const detectedItems: string[] = [];
        if (profile.framework.name) detectedItems.push(profile.framework.name);
        if (profile.database.orm) detectedItems.push(profile.database.orm);
        if (profile.language.primary) detectedItems.push(profile.language.primary);
        analyzeCodebaseSpinner.succeed(
          `Codebase analyzed${detectedItems.length > 0 ? ` (${detectedItems.join(", ")})` : ""}`
        );

        const reviseSpinner = ora("Revising spec to match codebase patterns...").start();
        const reviser = new SpecReviser(config.ANTHROPIC_API_KEY, {
          model: options.model,
        });
        spec = await reviser.revise(spec, profile);
        reviseSpinner.succeed("Specification revised to match codebase");
      }

      // Write output
      const writeSpinner = ora("Writing specification...").start();
      const outputPath = await writeSpec(spec, {
        outputPath: options.output,
        figmaUrl,
        fileName: analysis.fileName,
        prdFile: prdFileName,
      });
      writeSpinner.succeed(`Specification written to ${chalk.green(outputPath)}`);

      console.log(chalk.bold.green("\nDone!"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\nError: ${message}`));
      process.exit(1);
    }
  });

program.parse();
