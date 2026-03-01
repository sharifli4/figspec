import type { MiddlewareInfo } from "../types.js";
import { readPackageJson, hasDep } from "./utils.js";

const MIDDLEWARE_PACKAGES: Record<string, string> = {
  cors: "cors",
  helmet: "helmet",
  "express-rate-limit": "rate-limiter",
  morgan: "logger",
  compression: "compression",
  "cookie-parser": "cookie-parser",
  "body-parser": "body-parser",
  multer: "file-upload",
  "@nestjs/throttler": "rate-limiter",
};

const VALIDATION_PACKAGES: Record<string, string> = {
  zod: "zod",
  joi: "joi",
  yup: "yup",
  "class-validator": "class-validator",
  ajv: "ajv",
};

export async function detectMiddleware(
  projectPath: string
): Promise<MiddlewareInfo> {
  const pkg = await readPackageJson(projectPath);
  if (!pkg) {
    return { detected: [], hasErrorHandler: false, validationLibrary: null };
  }

  const detected: string[] = [];
  for (const [pkgName, label] of Object.entries(MIDDLEWARE_PACKAGES)) {
    if (hasDep(pkg, pkgName)) {
      detected.push(label);
    }
  }

  let validationLibrary: string | null = null;
  for (const [pkgName, name] of Object.entries(VALIDATION_PACKAGES)) {
    if (hasDep(pkg, pkgName)) {
      validationLibrary = name;
      break;
    }
  }

  // Error handler detection is heuristic — having express or nestjs implies
  // the project likely has some form of error handling middleware
  const hasErrorHandler =
    hasDep(pkg, "express") ||
    hasDep(pkg, "@nestjs/core") ||
    hasDep(pkg, "fastify");

  return { detected, hasErrorHandler, validationLibrary };
}
