import { IncomingMessage, ServerResponse } from "http";
import { ErrorCode } from "../types";
import type { ApiError } from "../types";
import { ValidationError } from "./validation";
import { logger } from "../infrastructure/logger";

// ── Request Helpers ──

/** Max request body size: 1MB (SEC-6 fix) */
const MAX_BODY_SIZE = 1024 * 1024;

export async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    req.on("data", (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        req.destroy();
        reject(new PayloadTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          reject(new Error("Request body must be a JSON object"));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch {
        reject(new Error("Invalid JSON in request body"));
      }
    });
    req.on("error", reject);
  });
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body exceeds maximum size (1MB)");
  }
}

export function getParam(url: string, pattern: RegExp): string | null {
  const match = url.match(pattern);
  return match ? match[1] : null;
}

export function getQueryParam(url: string, key: string): string | null {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return null;
  const params = new URLSearchParams(url.slice(qIdx));
  return params.get(key);
}

// ── Response Helpers ──

export function sendJson<T>(res: ServerResponse, status: number, data: T): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function sendSuccess<T>(res: ServerResponse, status: number, data: T): void {
  sendJson(res, status, { data });
}

export function sendError(
  res: ServerResponse,
  status: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): void {
  const body: ApiError = {
    error: { code, message, ...(details ? { details } : {}) },
  };
  sendJson(res, status, body);
}

// ── Error Handler ──

export function handleRouteError(res: ServerResponse, err: unknown): void {
  if (err instanceof ValidationError) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, err.message, err.details);
    return;
  }

  if (err instanceof PayloadTooLargeError) {
    sendError(res, 413, ErrorCode.PAYLOAD_TOO_LARGE, err.message);
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error({ error: message, stack }, "Unhandled route error");

  if (message.includes("UNIQUE constraint")) {
    sendError(res, 409, ErrorCode.CONFLICT, "Resource already exists");
    return;
  }

  sendError(res, 500, ErrorCode.INTERNAL, "Internal server error");
}

// ── Simple Router ──

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
) => Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    const patternStr = path.replace(/:([a-zA-Z_]+)/g, (_match, name: string) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^${patternStr}$`),
      paramNames,
      handler,
    });
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const method = (req.method ?? "GET").toUpperCase();
    const urlPath = (req.url ?? "/").split("?")[0];

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = urlPath.match(route.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });

      try {
        await route.handler(req, res, params);
      } catch (err) {
        handleRouteError(res, err);
      }
      return true;
    }
    return false;
  }
}
