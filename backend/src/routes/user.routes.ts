import { IncomingMessage, ServerResponse } from "http";
import { parseBody, sendSuccess, sendError } from "../utils/http";
import { validateEmail, validateIntake } from "../utils/validation";
import { ErrorCode } from "../types";
import { createJwt } from "../utils/auth";
import { userService } from "../utils/di";
import { magicLinkLimiter, verifyLimiter } from "../utils/rate-limiter";
import { emailService } from "../services/email.service";
import { env } from "../config/env";

/** POST /users - Create a new user */
export async function createUser(
  req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>
): Promise<void> {
  const body = await parseBody(req);
  const email = validateEmail(body.email);

  const existing = userService.findByEmail(email);
  if (existing) {
    sendError(res, 409, ErrorCode.CONFLICT, "Email already registered");
    return;
  }

  const user = userService.createUser(email);
  sendSuccess(res, 201, user);
}

/** POST /auth/magic-link - Send magic link */
export async function sendMagicLink(
  req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>
): Promise<void> {
  const body = await parseBody(req);
  const email = validateEmail(body.email);

  // SEC-7: Rate limit by email
  if (!magicLinkLimiter.check(email)) {
    sendError(res, 429, ErrorCode.RATE_LIMITED, "Too many magic link requests. Try again in 15 minutes.");
    return;
  }

  const user = userService.findByEmail(email);
  if (!user) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "User not found");
    return;
  }

  const token = userService.createMagicLinkToken(user.id);

  // Send the magic link email
  await emailService.sendMagicLink(email, token.token);

  // Return response - include dev token only in non-production
  const response: Record<string, unknown> = { sent: true };
  if (env.ENABLE_DEV_TOKENS) {
    response._dev_token = token.token;
    response._dev_expires_at = token.expires_at;
  }
  sendSuccess(res, 200, response);
}

/** POST /auth/verify - Verify magic link token */
export async function verifyToken(
  req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>
): Promise<void> {
  // SEC-7: Rate limit by IP (use remoteAddress or forwarded IP)
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
    ?? req.socket.remoteAddress
    ?? "unknown";
  if (!verifyLimiter.check(ip)) {
    sendError(res, 429, ErrorCode.RATE_LIMITED, "Too many verify attempts. Try again in 15 minutes.");
    return;
  }

  const body = await parseBody(req);

  if (typeof body.token !== "string" || !body.token) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "Token is required");
    return;
  }

  const user = userService.verifyToken(body.token);
  if (!user) {
    sendError(res, 401, ErrorCode.UNAUTHORIZED, "Invalid or expired token");
    return;
  }

  // Return a real JWT for authenticated API access
  sendSuccess(res, 200, {
    jwt: createJwt(user.id),
    user,
  });
}

/** PUT /users/:id/intake - Submit intake form */
export async function updateIntake(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const userId = params.id;

  const existing = userService.findById(userId);
  if (!existing) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "User not found");
    return;
  }

  const body = await parseBody(req);
  const intake = validateIntake(body);

  const updated = userService.updateIntake(userId, intake);
  if (!updated) {
    sendError(res, 500, ErrorCode.INTERNAL, "Failed to update user");
    return;
  }

  sendSuccess(res, 200, updated);
}

/** GET /users/:id - Get user by ID */
export async function getUser(
  _req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const user = userService.findById(params.id);
  if (!user) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "User not found");
    return;
  }
  sendSuccess(res, 200, user);
}
