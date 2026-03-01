import type { AuthInfo } from "../types.js";
import { readPackageJson, hasDep } from "./utils.js";

const AUTH_PACKAGES: Record<string, string> = {
  jsonwebtoken: "jwt",
  "jose": "jwt",
  passport: "passport",
  "passport-local": "local",
  "passport-jwt": "jwt",
  "passport-google-oauth20": "oauth-google",
  "passport-github2": "oauth-github",
  "express-session": "session",
  "@nestjs/passport": "passport",
  "@nestjs/jwt": "jwt",
  "next-auth": "next-auth",
  "better-auth": "better-auth",
  lucia: "lucia",
  "@supabase/supabase-js": "supabase-auth",
  "firebase-admin": "firebase-auth",
};

export async function detectAuth(projectPath: string): Promise<AuthInfo> {
  const pkg = await readPackageJson(projectPath);
  if (!pkg) return { strategies: [], packages: [] };

  const strategies: string[] = [];
  const packages: string[] = [];

  for (const [pkgName, strategy] of Object.entries(AUTH_PACKAGES)) {
    if (hasDep(pkg, pkgName)) {
      packages.push(pkgName);
      if (!strategies.includes(strategy)) {
        strategies.push(strategy);
      }
    }
  }

  return { strategies, packages };
}
