import { IncomingMessage, ServerResponse } from "http";
import { parseBody, sendSuccess, sendError, getQueryParam } from "../utils/http";
import { validateVentureUpdate, validateArtifactCreate } from "../utils/validation";
import { ErrorCode } from "../types";
import type { AuthenticatedRequest } from "../server";
import { ventureService } from "../utils/di";

/** GET /users/:id/ventures - List all ventures for a user */
export async function listUserVentures(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId || userId !== params.id) {
    sendError(res, 403, ErrorCode.FORBIDDEN, "Can only list your own ventures");
    return;
  }

  const ventures = ventureService.listByUserId(userId);
  sendSuccess(res, 200, { ventures, limit: 3 });
}

/** POST /ventures - Create a new venture */
export async function createVenture(
  req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>
): Promise<void> {
  // Use authenticated user_id from JWT — not from request body (SEC-1 fix)
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId) {
    sendError(res, 401, ErrorCode.UNAUTHORIZED, "Authentication required");
    return;
  }

  try {
    const venture = ventureService.createVenture(userId);
    sendSuccess(res, 201, venture);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("VENTURE_LIMIT")) {
      sendError(res, 409, ErrorCode.CONFLICT, message.replace("VENTURE_LIMIT: ", ""));
      return;
    }
    if (message.includes("UNIQUE constraint")) {
      sendError(res, 409, ErrorCode.CONFLICT, "Resource conflict");
      return;
    }
    throw err;
  }
}

/**
 * Verify that the authenticated user owns the venture.
 * Returns the venture if authorized, sends error and returns null otherwise.
 * (LOGIC-4, EDGE-2 fix: ownership verification)
 */
function verifyOwnership(
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

/** GET /ventures/:id - Get venture with phase summary */
export async function getVenture(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyOwnership(req, res, params.id);
  if (!venture) return;

  const phases = ventureService.getPhases(venture.id);
  const artifactCount = ventureService.listArtifacts(venture.id).length;

  sendSuccess(res, 200, { venture, phases, artifact_count: artifactCount });
}

/** PATCH /ventures/:id - Update venture fields */
export async function updateVenture(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyOwnership(req, res, params.id);
  if (!venture) return;

  const body = await parseBody(req);
  const fields = validateVentureUpdate(body);
  const changedFields = Object.keys(fields);
  const updated = ventureService.updateVenture(params.id, fields);

  if (!updated) {
    sendError(res, 500, ErrorCode.INTERNAL, "Failed to update venture");
    return;
  }

  // UX-4: Include which fields were changed
  sendSuccess(res, 200, { ...updated, _changed_fields: changedFields });
}

/** GET /ventures/:id/phases - List all phases */
export async function getPhases(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyOwnership(req, res, params.id);
  if (!venture) return;

  const phases = ventureService.getPhases(venture.id);
  sendSuccess(res, 200, { phases });
}

/** GET /ventures/:id/artifacts - List artifacts with optional filters */
export async function listArtifacts(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyOwnership(req, res, params.id);
  if (!venture) return;

  const url = req.url ?? "";
  const phaseStr = getQueryParam(url, "phase");
  const type = getQueryParam(url, "type");

  const phase = phaseStr ? parseInt(phaseStr, 10) : undefined;
  if (phaseStr && (isNaN(phase!) || phase! < 1 || phase! > 5)) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "phase must be 1-5");
    return;
  }

  const artifacts = ventureService.listArtifacts(
    venture.id,
    phase,
    type ?? undefined
  );
  sendSuccess(res, 200, { artifacts });
}

/** POST /ventures/:id/artifacts - Create new artifact */
export async function createArtifact(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyOwnership(req, res, params.id);
  if (!venture) return;

  const body = await parseBody(req);
  const validated = validateArtifactCreate(body);

  const artifact = ventureService.createArtifact(
    venture.id,
    validated.phase_number,
    validated.type,
    validated.content
  );
  sendSuccess(res, 201, artifact);
}

/** PUT /ventures/:id/artifacts/:aid - Update artifact content */
export async function updateArtifact(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyOwnership(req, res, params.id);
  if (!venture) return;

  const body = await parseBody(req);
  if (typeof body.content !== "object" || body.content === null || Array.isArray(body.content)) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "content must be a JSON object");
    return;
  }

  // EDGE-2 fix: scope artifact lookup to this venture
  const updated = ventureService.updateArtifact(
    params.aid,
    body.content as Record<string, unknown>,
    venture.id  // pass ventureId for scoped lookup
  );
  if (!updated) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "Artifact not found");
    return;
  }

  sendSuccess(res, 200, updated);
}
