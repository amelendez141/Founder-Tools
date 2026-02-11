import { IncomingMessage, ServerResponse } from "http";
import { parseBody, sendSuccess, sendError } from "../utils/http";
import { ErrorCode } from "../types";
import type { AuthenticatedRequest } from "../server";
import { ventureService, phaseService } from "../utils/di";

export { phaseService };

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

/** GET /ventures/:id/phases/enriched - Get phases with config content */
export async function getEnrichedPhases(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const phases = phaseService.getEnrichedPhases(venture.id);
  sendSuccess(res, 200, { phases });
}

/** POST /ventures/:id/phases/:num/gate - Evaluate gate criteria */
export async function evaluateGate(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const phaseNumber = parseInt(params.num, 10);
  if (isNaN(phaseNumber) || phaseNumber < 1 || phaseNumber > 5) {
    sendError(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      "Phase number must be between 1 and 5"
    );
    return;
  }

  try {
    const result = phaseService.evaluateGate(venture.id, phaseNumber);
    sendSuccess(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "PHASE_LOCKED") {
      sendError(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        "Cannot evaluate gate for a locked phase"
      );
      return;
    }
    throw err;
  }
}

/** POST /ventures/:id/phases/:num/unlock - Admin force-unlock */
export async function forceUnlock(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const phaseNumber = parseInt(params.num, 10);
  if (isNaN(phaseNumber) || phaseNumber < 1 || phaseNumber > 5) {
    sendError(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      "Phase number must be between 1 and 5"
    );
    return;
  }

  const body = await parseBody(req);
  const reason = body.reason;
  if (typeof reason !== "string" || !reason.trim()) {
    sendError(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      "Reason is required for force-unlock"
    );
    return;
  }

  // NOTE: In production, this would check for admin role via JWT.
  // Per architecture: "admin only" — V1 trusts the caller.
  const phase = phaseService.forceUnlock(
    venture.id,
    phaseNumber,
    reason.trim()
  );
  if (!phase) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "Phase not found");
    return;
  }

  sendSuccess(res, 200, phase);
}

/** PATCH /ventures/:id/phases/:num/gate/:key - Update self-reported gate */
export async function updateGateCriterion(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const phaseNumber = parseInt(params.num, 10);
  if (isNaN(phaseNumber) || phaseNumber < 1 || phaseNumber > 5) {
    sendError(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      "Phase number must be between 1 and 5"
    );
    return;
  }

  const gateKey = params.key;
  if (!gateKey) {
    sendError(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      "Gate key is required"
    );
    return;
  }

  const body = await parseBody(req);
  if (typeof body.satisfied !== "boolean") {
    sendError(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      "satisfied must be a boolean"
    );
    return;
  }

  try {
    const criteria = phaseService.updateGateCriterion(
      venture.id,
      phaseNumber,
      gateKey,
      body.satisfied
    );
    sendSuccess(res, 200, { gate_criteria: criteria });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found")) {
      sendError(res, 404, ErrorCode.NOT_FOUND, message);
      return;
    }
    throw err;
  }
}

/** GET /phases/config - Get all phase configurations */
export async function getPhaseConfigs(
  _req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>
): Promise<void> {
  const configs = phaseService.getAllPhaseConfigs();
  sendSuccess(res, 200, { configs });
}

/** GET /phases/config/:num - Get single phase configuration */
export async function getPhaseConfig(
  _req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const phaseNumber = parseInt(params.num, 10);
  if (isNaN(phaseNumber) || phaseNumber < 1 || phaseNumber > 5) {
    sendError(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      "Phase number must be between 1 and 5"
    );
    return;
  }

  const config = phaseService.getPhaseConfig(phaseNumber);
  if (!config) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "Phase config not found");
    return;
  }

  sendSuccess(res, 200, config);
}
