import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  FIGMA_API_KEY: z.string().min(1, "FIGMA_API_KEY is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => i.path.join("."))
      .join(", ");
    throw new Error(
      `Missing or invalid environment variables: ${missing}\nCopy .env.example to .env and fill in your API keys.`
    );
  }
  return result.data;
}
