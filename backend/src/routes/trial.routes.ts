/**
 * Anonymous Trial Chat Routes
 *
 * All endpoints are PUBLIC (no auth required) — that's the whole point.
 *
 * Endpoints:
 * - POST /trial/session          — Create anonymous session
 * - POST /trial/chat             — Send trial chat message (3 max)
 * - GET  /trial/session/:token   — Get trial session status + history
 * - POST /trial/claim            — Claim session after sign-up (requires auth)
 */

import { IncomingMessage, ServerResponse } from "http";
import { parseBody, sendSuccess, sendError } from "../utils/http";
import { ErrorCode } from "../types";
import type { AuthenticatedRequest } from "../server";
import { anonymousChatService } from "../utils/di";

/** POST /trial/session — Create a new anonymous trial session */
export async function createTrialSession(
  _req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>
): Promise<void> {
  const session = anonymousChatService.createSession();
  sendSuccess(res, 201, {
    session_token: session.session_token,
    messages_limit: 3,
    messages_remaining: 3,
  });
}

/** POST /trial/chat — Send a message in anonymous trial mode */
export async function trialChat(
  req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>
): Promise<void> {
  const body = await parseBody(req);

  const sessionToken = body.session_token;
  if (typeof sessionToken !== "string" || !sessionToken.trim()) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "session_token is required");
    return;
  }

  const message = body.message;
  if (typeof message !== "string" || !message.trim()) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "message is required (non-empty string)");
    return;
  }

  if (message.length > 2000) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "message must be at most 2000 characters");
    return;
  }

  try {
    const result = await anonymousChatService.chat(sessionToken, message.trim());
    sendSuccess(res, 200, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "SESSION_NOT_FOUND") {
      sendError(res, 404, ErrorCode.NOT_FOUND, "Trial session not found. Create a new session first.");
      return;
    }
    if (msg === "TRIAL_LIMIT_REACHED") {
      sendError(res, 429, ErrorCode.RATE_LIMITED,
        "Trial limit reached (3 messages). Sign up for unlimited access!",
        { messages_limit: 3, sign_up_url: "/users" }
      );
      return;
    }
    if (msg.startsWith("SESSION_CLAIMED")) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR,
        "This trial session has been linked to an account. Please sign in to continue.");
      return;
    }
    if (msg.includes("LLM_UNAVAILABLE")) {
      sendError(res, 503, ErrorCode.LLM_UNAVAILABLE,
        "AI service temporarily unavailable. Please try again shortly.");
      return;
    }
    throw err;
  }
}

/** GET /trial/session/:token — Get trial session status and history */
export async function getTrialStatus(
  _req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const token = params.token;
  if (!token) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "Session token is required");
    return;
  }

  const status = anonymousChatService.getStatus(token);
  if (!status) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "Trial session not found");
    return;
  }

  sendSuccess(res, 200, status);
}

/** POST /trial/claim — Claim anonymous session after sign-up (requires auth) */
export async function claimTrialSession(
  req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>
): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId) {
    sendError(res, 401, ErrorCode.UNAUTHORIZED, "Authentication required to claim a trial session");
    return;
  }

  const body = await parseBody(req);
  const sessionToken = body.session_token;
  if (typeof sessionToken !== "string" || !sessionToken.trim()) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "session_token is required");
    return;
  }

  const success = anonymousChatService.claimSession(sessionToken, userId);
  if (!success) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "Trial session not found");
    return;
  }

  sendSuccess(res, 200, { claimed: true, user_id: userId });
}
