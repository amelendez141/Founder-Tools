/**
 * Centralized environment configuration with validation
 */

interface EnvConfig {
  // Server
  NODE_ENV: "development" | "test" | "production";
  PORT: number;

  // Auth
  JWT_SECRET: string;
  JWT_EXPIRY_SECONDS: number;

  // Database
  DATABASE_PATH: string;

  // CORS
  CORS_ORIGINS: string[];

  // Email (Resend)
  RESEND_API_KEY: string | null;
  EMAIL_FROM: string;

  // LLM
  ANTHROPIC_API_KEY: string | null;
  LLM_TIMEOUT_MS: number;

  // Feature flags
  ENABLE_DEV_TOKENS: boolean;
}

function parseEnv(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(nodeEnv)) {
    console.warn(`[ENV] Invalid NODE_ENV "${nodeEnv}", defaulting to "development"`);
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && nodeEnv === "production") {
    console.error("[ENV] JWT_SECRET is required in production");
    process.exit(1);
  }

  const corsOriginsRaw = process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173,https://founder-tools-kz3d.vercel.app";
  const corsOrigins = corsOriginsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  return {
    NODE_ENV: nodeEnv as EnvConfig["NODE_ENV"],
    PORT: parseInt(process.env.PORT ?? "3000", 10),

    JWT_SECRET: jwtSecret ?? generateRandomSecret(),
    JWT_EXPIRY_SECONDS: parseInt(process.env.JWT_EXPIRY_SECONDS ?? "604800", 10), // 7 days

    DATABASE_PATH: process.env.DATABASE_PATH ??
      (process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH.replace(/^\/\//, "/")}/toolkit.db`
        : "./data/toolkit.db"),

    CORS_ORIGINS: corsOrigins,

    RESEND_API_KEY: process.env.RESEND_API_KEY ?? null,
    EMAIL_FROM: process.env.EMAIL_FROM ?? "noreply@foundertoolkit.com",

    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? null,
    LLM_TIMEOUT_MS: parseInt(process.env.LLM_TIMEOUT_MS ?? "30000", 10),

    ENABLE_DEV_TOKENS: nodeEnv !== "production",
  };
}

function generateRandomSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  for (const byte of randomBytes) {
    result += chars[byte % chars.length];
  }
  console.warn("[ENV] JWT_SECRET not set, generated random secret (not persistent across restarts)");
  return result;
}

export const env = parseEnv();

// Log configuration on startup (excluding secrets)
export function logEnvSummary(): void {
  console.log(`[ENV] NODE_ENV: ${env.NODE_ENV}`);
  console.log(`[ENV] PORT: ${env.PORT}`);
  console.log(`[ENV] DATABASE_PATH: ${env.DATABASE_PATH}`);
  console.log(`[ENV] CORS_ORIGINS: ${env.CORS_ORIGINS.join(", ")}`);
  console.log(`[ENV] EMAIL_FROM: ${env.EMAIL_FROM}`);
  console.log(`[ENV] RESEND_API_KEY: ${env.RESEND_API_KEY ? "configured" : "not set (emails disabled)"}`);
  console.log(`[ENV] ANTHROPIC_API_KEY: ${env.ANTHROPIC_API_KEY ? "configured" : "not set (using mock LLM)"}`);
}
