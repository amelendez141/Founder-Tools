import { createServer, IncomingMessage, ServerResponse } from "http";
import { Router, sendError, sendJson } from "./utils/http";
import { initSchema } from "./utils/schema";
import { ErrorCode } from "./types";
import { verifyJwt } from "./utils/auth";
import { env, logEnvSummary } from "./config/env";
import { logger } from "./infrastructure/logger";
import { setupGracefulShutdown } from "./infrastructure/shutdown";
import { attachRequestId } from "./middleware/request-id";

// Route handlers
import {
  createUser,
  register,
  login,
  sendMagicLink,
  verifyToken,
  updateIntake,
  getUser,
} from "./routes/user.routes";
import {
  createVenture,
  getVenture,
  updateVenture,
  getPhases,
  listArtifacts,
  createArtifact,
  updateArtifact,
  listUserVentures,
} from "./routes/venture.routes";
import {
  phaseService,
  getEnrichedPhases,
  evaluateGate,
  forceUnlock,
  updateGateCriterion,
  getPhaseConfigs,
  getPhaseConfig,
} from "./routes/phase.routes";
import {
  chat,
  chatHistory,
  generateArtifact,
  getRateLimit,
} from "./routes/ai.routes";
import {
  getDashboard,
  shareArtifact,
  unshareArtifact,
  getPublicArtifact,
  getPhasePreview,
  getSuggestedActions,
} from "./routes/ux.routes";
import {
  createTrialSession,
  trialChat,
  getTrialStatus,
  claimTrialSession,
} from "./routes/trial.routes";
import { PHASE_SEED } from "./config/phase-seed";

// ── Initialize ──
logEnvSummary();

initSchema();
logger.info({}, "Database schema initialized");

phaseService.seedPhaseConfig(PHASE_SEED);
logger.info({}, "Phase config seeded (5 phases)");

// ── Router Setup ──
const router = new Router();

// User endpoints
router.add("POST", "/users", createUser);
router.add("GET", "/users/:id", getUser);
router.add("PUT", "/users/:id/intake", updateIntake);
router.add("GET", "/users/:id/ventures", listUserVentures);

// Auth endpoints
router.add("POST", "/auth/register", register);
router.add("POST", "/auth/login", login);
router.add("POST", "/auth/magic-link", sendMagicLink);
router.add("POST", "/auth/verify", verifyToken);

// Venture endpoints
router.add("POST", "/ventures", createVenture);
router.add("GET", "/ventures/:id", getVenture);
router.add("PATCH", "/ventures/:id", updateVenture);
router.add("GET", "/ventures/:id/phases", getPhases);
// EDGE-6: /phases/enriched and /phases/preview MUST be registered before /phases/:num routes
// because "enriched" and "preview" would match the :num wildcard otherwise.
router.add("GET", "/ventures/:id/phases/enriched", getEnrichedPhases);
router.add("GET", "/ventures/:id/phases/preview", getPhasePreview);
router.add("POST", "/ventures/:id/phases/:num/gate", evaluateGate);
router.add("POST", "/ventures/:id/phases/:num/unlock", forceUnlock);
router.add("PATCH", "/ventures/:id/phases/:num/gate/:key", updateGateCriterion);
router.add("GET", "/ventures/:id/artifacts", listArtifacts);
router.add("POST", "/ventures/:id/artifacts", createArtifact);
router.add("PUT", "/ventures/:id/artifacts/:aid", updateArtifact);

// Phase config endpoints (public, no auth)
router.add("GET", "/phases/config", getPhaseConfigs);
router.add("GET", "/phases/config/:num", getPhaseConfig);

// AI Copilot endpoints
router.add("POST", "/ventures/:id/chat", chat);
router.add("GET", "/ventures/:id/chat/history", chatHistory);
router.add("POST", "/ventures/:id/generate/:type", generateArtifact);
router.add("GET", "/ventures/:id/rate-limit", getRateLimit);

// Health check
router.add("GET", "/health", async (_req: IncomingMessage, res: ServerResponse) => {
  sendJson(res, 200, { status: "ok", timestamp: new Date().toISOString() });
});

// UX Feature routes
router.add("GET", "/ventures/:id/dashboard", getDashboard);
router.add("GET", "/ventures/:id/suggested-actions", getSuggestedActions);
router.add("POST", "/ventures/:id/artifacts/:aid/share", shareArtifact);
router.add("DELETE", "/ventures/:id/artifacts/:aid/share", unshareArtifact);
router.add("GET", "/shared/:slug", getPublicArtifact);

// Anonymous trial chat routes (public - no auth except /trial/claim)
router.add("POST", "/trial/session", createTrialSession);
router.add("POST", "/trial/chat", trialChat);
router.add("GET", "/trial/session/:token", getTrialStatus);
router.add("POST", "/trial/claim", claimTrialSession);

// ── Server ──
const PORT = env.PORT;

// Public routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  "POST /users",
  "POST /auth/register",
  "POST /auth/login",
  "POST /auth/magic-link",
  "POST /auth/verify",
  "GET /health",
  "GET /phases/config",
  "POST /trial/session",
  "POST /trial/chat",
]);

function isPublicRoute(method: string, urlPath: string): boolean {
  const key = `${method} ${urlPath}`;
  if (PUBLIC_ROUTES.has(key)) return true;
  // Handle parameterized public routes
  if (method === "GET" && /^\/phases\/config\/\d+$/.test(urlPath)) return true;
  // Public artifact sharing route - no auth required
  if (method === "GET" && /^\/shared\/[a-zA-Z0-9]+$/.test(urlPath)) return true;
  // Trial session status - no auth required
  if (method === "GET" && /^\/trial\/session\/[a-zA-Z0-9_-]+$/.test(urlPath)) return true;
  return false;
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const startTime = Date.now();
  const requestId = attachRequestId(req, res);
  const reqLogger = logger.child({ requestId });

  // CORS headers (SEC-4: restricted origins)
  const origin = req.headers.origin ?? "";
  if (env.CORS_ORIGINS.includes(origin) || env.CORS_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const method = (req.method ?? "GET").toUpperCase();
  const urlPath = (req.url ?? "/").split("?")[0];

  reqLogger.info({ method, path: urlPath }, "Request received");

  // Authentication middleware (SEC-1 fix)
  if (!isPublicRoute(method, urlPath)) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      sendError(res, 401, ErrorCode.UNAUTHORIZED, "Authorization header required (Bearer <token>)");
      return;
    }
    const jwt = verifyJwt(authHeader.slice(7));
    if (!jwt) {
      sendError(res, 401, ErrorCode.UNAUTHORIZED, "Invalid or expired token");
      return;
    }
    // Attach authenticated user_id to the request for downstream handlers
    (req as AuthenticatedRequest).userId = jwt.sub;
  }

  const handled = await router.handle(req, res);
  if (!handled) {
    sendError(res, 404, ErrorCode.NOT_FOUND, `Route not found: ${req.method} ${req.url}`);
  }

  const duration = Date.now() - startTime;
  reqLogger.info({ method, path: urlPath, status: res.statusCode, durationMs: duration }, "Request completed");
});

/** Request with authenticated user ID attached by middleware */
export interface AuthenticatedRequest extends IncomingMessage {
  userId?: string;
}

// Setup graceful shutdown
setupGracefulShutdown(server);

server.listen(PORT, () => {
  logger.info({ port: PORT }, "Founder Toolkit API server started");
  console.log(`\n  Founder Toolkit API running on http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/health\n`);
});

export { server };
