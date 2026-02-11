import { IncomingMessage, ServerResponse } from "http";
import { parseBody, sendSuccess, sendError, getQueryParam } from "../utils/http";
import { ErrorCode } from "../types";
import type { AuthenticatedRequest } from "../server";
import { ventureService, aiService } from "../utils/di";

export { aiService };

/** Verify venture exists and belongs to authenticated user */
function verifyVentureOwnership(
  req: IncomingMessage,
  res: ServerResponse,
  ventureId: string
): ReturnType<typeof ventureService.findById> {
  const userId = (req as AuthenticatedRequest).userId;
  const venture = ventureService.findById(ventureId);
  if (!venture) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "Venture not found");
    return null;
  }
  if (userId && venture.user_id !== userId) {
    sendError(res, 403, ErrorCode.FORBIDDEN, "You do not own this venture");
    return null;
  }
  return venture;
}

/** POST /ventures/:id/chat — Send a chat message */
export async function chat(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const body = await parseBody(req);
  const message = body.message;
  if (typeof message !== "string" || !message.trim()) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "message is required (non-empty string)");
    return;
  }
  // SEC-6: cap chat message length
  if (message.length > 5000) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "message must be at most 5000 characters");
    return;
  }

  const phaseNumber = body.phase_number;
  if (typeof phaseNumber !== "number" || !Number.isInteger(phaseNumber) || phaseNumber < 1 || phaseNumber > 5) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "phase_number must be an integer between 1 and 5");
    return;
  }

  // UX-6: Optional conversation_id to resume a specific conversation
  const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : undefined;

  try {
    const result = await aiService.chat(venture.id, phaseNumber, message.trim(), conversationId);
    sendSuccess(res, 200, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "RATE_LIMITED") {
      const limit = aiService.getRateLimit(venture.id);
      sendError(res, 429, ErrorCode.RATE_LIMITED,
        `Daily message limit reached (${limit.messages_limit}/day). Resets at ${limit.resets_at}`,
        { rate_limit: limit as unknown as Record<string, unknown> });
      return;
    }
    if (msg.includes("LLM_UNAVAILABLE")) {
      sendError(res, 503, ErrorCode.LLM_UNAVAILABLE,
        "AI service temporarily unavailable. Your message has been saved — please try again shortly.");
      return;
    }
    if (msg.includes("LLM_AUTH_ERROR")) {
      sendError(res, 503, ErrorCode.LLM_UNAVAILABLE, "AI service configuration error.");
      return;
    }
    throw err;
  }
}

/** GET /ventures/:id/chat/history — Get chat history */
export async function chatHistory(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const url = req.url ?? "";
  const phaseStr = getQueryParam(url, "phase");
  let phase: number | undefined;
  if (phaseStr) {
    phase = parseInt(phaseStr, 10);
    if (isNaN(phase) || phase < 1 || phase > 5) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, "phase must be 1-5");
      return;
    }
  }

  const history = aiService.getChatHistory(venture.id, phase);
  sendSuccess(res, 200, { messages: history });
}

/** POST /ventures/:id/generate/:type — Generate an artifact */
export async function generateArtifact(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const type = params.type;
  if (!type) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "Artifact type is required in URL");
    return;
  }

  const body = await parseBody(req);
  const phaseNumber = body.phase_number;
  if (typeof phaseNumber !== "number" || !Number.isInteger(phaseNumber) || phaseNumber < 1 || phaseNumber > 5) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "phase_number must be an integer between 1 and 5");
    return;
  }

  try {
    const result = await aiService.generate(venture.id, phaseNumber, type);
    sendSuccess(res, 200, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "RATE_LIMITED") {
      const limit = aiService.getRateLimit(venture.id);
      sendError(res, 429, ErrorCode.RATE_LIMITED,
        `Not enough daily quota for artifact generation (costs 3 units). Resets at ${limit.resets_at}`,
        { rate_limit: limit as unknown as Record<string, unknown> });
      return;
    }
    if (msg.includes("INVALID_TYPE")) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, msg);
      return;
    }
    if (msg.includes("LLM_UNAVAILABLE")) {
      sendError(res, 503, ErrorCode.LLM_UNAVAILABLE,
        "AI service temporarily unavailable. Please try again shortly.");
      return;
    }
    if (msg.includes("LLM_AUTH_ERROR")) {
      sendError(res, 503, ErrorCode.LLM_UNAVAILABLE, "AI service configuration error.");
      return;
    }
    throw err;
  }
}

/** GET /ventures/:id/rate-limit — Get rate limit status */
export async function getRateLimit(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const limit = aiService.getRateLimit(venture.id);
  sendSuccess(res, 200, limit);
}
