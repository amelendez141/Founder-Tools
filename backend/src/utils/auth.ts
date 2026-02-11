import { createHmac, randomBytes } from "crypto";

/**
 * Lightweight JWT implementation using HMAC-SHA256.
 *
 * Fixes: SEC-1 (zero authentication)
 *
 * In production, replace with a proper JWT library (jose, jsonwebtoken).
 * This is intentionally minimal for V1 — no RSA, no kid rotation, just HMAC.
 */

// Generate a random secret on startup if not provided via env
const JWT_SECRET = process.env.JWT_SECRET ?? randomBytes(32).toString("hex");
const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

if (!process.env.JWT_SECRET) {
  console.log("[AUTH] No JWT_SECRET env var — using random secret (tokens won't survive restart)");
}

export interface JwtPayload {
  sub: string;   // user_id
  iat: number;   // issued at (unix seconds)
  exp: number;   // expires at (unix seconds)
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(data: string): string {
  const padded = data + "=".repeat((4 - (data.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function sign(header: string, payload: string): string {
  const data = `${header}.${payload}`;
  return createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createJwt(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: userId,
      iat: now,
      exp: now + JWT_EXPIRY_SECONDS,
    })
  );
  const signature = sign(header, payload);
  return `${header}.${payload}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSig = sign(header, payload);

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSig.length) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  if (diff !== 0) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return null;
    return decoded;
  } catch {
    return null;
  }
}
