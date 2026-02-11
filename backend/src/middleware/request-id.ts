/**
 * Request ID middleware for request tracing
 *
 * Generates a unique ID for each request and attaches it to the request object.
 * This ID is also returned in the X-Request-Id response header.
 */

import { IncomingMessage, ServerResponse } from "http";

export interface RequestWithId extends IncomingMessage {
  requestId: string;
}

/**
 * Generates a unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

/**
 * Attaches a request ID to the request and response
 */
export function attachRequestId(req: IncomingMessage, res: ServerResponse): string {
  // Check for existing request ID header (from load balancer or gateway)
  const existingId = req.headers["x-request-id"];
  const requestId = typeof existingId === "string" ? existingId : generateRequestId();

  // Attach to request object
  (req as RequestWithId).requestId = requestId;

  // Add to response headers
  res.setHeader("X-Request-Id", requestId);

  return requestId;
}

/**
 * Gets the request ID from a request object
 */
export function getRequestId(req: IncomingMessage): string | undefined {
  return (req as RequestWithId).requestId;
}
