/**
 * UX Feature Routes — Phase 2 Implementation
 *
 * New endpoints:
 * - GET  /ventures/:id/dashboard       — Aggregated progress dashboard
 * - POST /ventures/:id/artifacts/:aid/share   — Make artifact publicly shareable
 * - DELETE /ventures/:id/artifacts/:aid/share — Revoke public access
 * - GET  /shared/:slug                 — Public artifact view (no auth)
 * - GET  /ventures/:id/phases/preview  — Phase journey preview (all phases visible)
 */

import { IncomingMessage, ServerResponse } from "http";
import { sendSuccess, sendError } from "../utils/http";
import { ErrorCode } from "../types";
import type { SuggestedAction, DashboardResponse } from "../types";
import type { AuthenticatedRequest } from "../server";
import { ventureService, phaseService, aiService } from "../utils/di";

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

/**
 * Compute smart next-action suggestions based on current venture state.
 * Returns 1-3 contextual suggestions.
 */
function computeSuggestedActions(
  ventureId: string,
  currentPhaseNumber: number
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const phases = ventureService.getPhases(ventureId);
  const currentPhase = phases.find((p) => p.phase_number === currentPhaseNumber);
  if (!currentPhase) return actions;

  const artifacts = ventureService.listArtifacts(ventureId);
  const unsatisfiedGates = currentPhase.gate_criteria.filter((g) => !g.satisfied);

  // Priority 1: If all gates are satisfied, suggest advancing
  if (unsatisfiedGates.length === 0 && currentPhaseNumber < 5) {
    actions.push({
      type: "advance_phase",
      message: `All Phase ${currentPhaseNumber} goals are complete! Ready to advance to the next phase.`,
    });
  }

  // Priority 2: Suggest completing the next unsatisfied gate
  if (unsatisfiedGates.length > 0) {
    const nextGate = unsatisfiedGates[0];
    if (nextGate.gate_type === "auto") {
      // Auto gates need venture data — suggest filling in fields or generating artifacts
      const artifactTypeMap: Record<string, string> = {
        "offer_statement": "OFFER_STATEMENT",
        "growth_plan": "GROWTH_PLAN",
        "competitors_identified": "CUSTOM",
      };
      const suggestedType = artifactTypeMap[nextGate.key];
      if (suggestedType && suggestedType !== "CUSTOM") {
        actions.push({
          type: "generate_artifact",
          message: `Generate your ${suggestedType.replace(/_/g, " ").toLowerCase()} to unlock the next step.`,
          artifact_type: suggestedType,
          gate_key: nextGate.key,
        });
      } else {
        actions.push({
          type: "complete_gate",
          message: `Next step: ${nextGate.label}`,
          gate_key: nextGate.key,
        });
      }
    } else {
      // Self-reported gates — prompt user to confirm
      actions.push({
        type: "complete_gate",
        message: `When you're ready, mark "${nextGate.label}" as complete.`,
        gate_key: nextGate.key,
      });
    }
  }

  // Priority 3: Contextual artifact suggestions per phase
  const phaseArtifactHints: Record<number, { type: string; label: string }[]> = {
    1: [],
    2: [
      { type: "BUSINESS_PLAN", label: "business plan" },
      { type: "OFFER_STATEMENT", label: "offer statement" },
    ],
    3: [],
    4: [{ type: "GTM_PLAN", label: "go-to-market plan" }],
    5: [{ type: "GROWTH_PLAN", label: "90-day growth plan" }],
  };

  const hints = phaseArtifactHints[currentPhaseNumber] ?? [];
  for (const hint of hints) {
    const hasArtifact = artifacts.some(
      (a) => a.type === hint.type && a.phase_number === currentPhaseNumber
    );
    if (!hasArtifact && actions.length < 3) {
      actions.push({
        type: "generate_artifact",
        message: `Use the AI copilot to generate your ${hint.label}.`,
        artifact_type: hint.type,
      });
    }
  }

  // Phase 5 special: always encourage iteration
  if (currentPhaseNumber === 5 && actions.length === 0) {
    actions.push({
      type: "keep_going" as SuggestedAction["type"],
      message: "Review your 90-day growth plan and set new targets for the next cycle.",
    });
  }

  return actions.slice(0, 3);
}

/** GET /ventures/:id/dashboard — Aggregated progress dashboard */
export async function getDashboard(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const dashData = ventureService.getDashboard(venture.id);
  if (!dashData) {
    sendError(res, 500, ErrorCode.INTERNAL, "Failed to load dashboard");
    return;
  }

  const { phases, artifacts, days_active } = dashData;
  const configs = phaseService.getAllPhaseConfigs();

  // Find current active phase (first non-complete, non-locked)
  const activePhase = phases.find((p) => p.status === "ACTIVE") ?? phases[0];
  const currentPhaseNumber = activePhase.phase_number;
  const currentConfig = configs.find((c) => c.phase_number === currentPhaseNumber);

  const phasesCompleted = phases.filter((p) => p.status === "COMPLETE").length;
  const currentGates = activePhase.gate_criteria;
  const gatesSatisfied = currentGates.filter((g) => g.satisfied).length;

  const streak = ventureService.getStreak(venture.id);
  const rateLimit = aiService.getRateLimit(venture.id);

  const suggestedActions = computeSuggestedActions(venture.id, currentPhaseNumber);
  const nextAction = suggestedActions[0] ?? {
    type: "keep_going" as const,
    message: "You're making great progress — keep it up!",
  };

  const dashboard: DashboardResponse = {
    venture_id: venture.id,
    venture_name: venture.name,
    current_phase: currentPhaseNumber,
    current_phase_name: currentConfig?.name ?? `Phase ${currentPhaseNumber}`,
    overall_progress: {
      phases_completed: phasesCompleted,
      total_phases: 5,
      percentage: Math.round((phasesCompleted / 5) * 100),
    },
    current_phase_progress: {
      gates_satisfied: gatesSatisfied,
      total_gates: currentGates.length,
      percentage: currentGates.length > 0
        ? Math.round((gatesSatisfied / currentGates.length) * 100)
        : 0,
    },
    artifacts_generated: artifacts.length,
    days_active,
    streak,
    next_action: nextAction,
    rate_limit: rateLimit,
  };

  sendSuccess(res, 200, dashboard);
}

/** POST /ventures/:id/artifacts/:aid/share — Make artifact shareable */
export async function shareArtifact(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const slug = ventureService.makeArtifactPublic(params.aid, venture.id);
  if (!slug) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "Artifact not found");
    return;
  }

  sendSuccess(res, 200, {
    public_slug: slug,
    public_url: `/shared/${slug}`,
  });
}

/** DELETE /ventures/:id/artifacts/:aid/share — Revoke public access */
export async function unshareArtifact(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const success = ventureService.revokeArtifactPublic(params.aid, venture.id);
  if (!success) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "Artifact not found");
    return;
  }

  sendSuccess(res, 200, { revoked: true });
}

/** GET /shared/:slug — Public artifact view (no auth required) */
export async function getPublicArtifact(
  _req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const slug = params.slug;
  if (!slug || slug.length > 20) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, "Invalid slug");
    return;
  }

  const artifact = ventureService.findArtifactBySlug(slug);
  if (!artifact) {
    sendError(res, 404, ErrorCode.NOT_FOUND, "Shared artifact not found or link has been revoked");
    return;
  }

  // Get venture name and phase name for context
  const venture = ventureService.findById(artifact.venture_id);
  const configs = phaseService.getAllPhaseConfigs();
  const phaseConfig = configs.find((c) => c.phase_number === artifact.phase_number);

  sendSuccess(res, 200, {
    artifact: {
      id: artifact.id,
      type: artifact.type,
      content: artifact.content,
      version: artifact.version,
      created_at: artifact.created_at,
    },
    venture_name: venture?.name ?? null,
    phase_name: phaseConfig?.name ?? `Phase ${artifact.phase_number}`,
  });
}

/** GET /ventures/:id/phases/preview — Full journey preview with all phases visible */
export async function getPhasePreview(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const phases = ventureService.getPhases(venture.id);
  const configs = phaseService.getAllPhaseConfigs();

  const preview = configs.map((config) => {
    const phase = phases.find((p) => p.phase_number === config.phase_number);
    const status = phase?.status ?? "LOCKED";

    return {
      phase_number: config.phase_number,
      name: config.name,
      description: config.description,
      core_deliverable: config.core_deliverable,
      tool_recommendations: config.tool_recommendations,
      status,
      // Show gate labels for all phases (not just unlocked ones)
      gate_labels: (phase?.gate_criteria ?? []).map((g) => ({
        key: g.key,
        label: g.label,
        satisfied: status === "LOCKED" ? false : g.satisfied,
        gate_type: g.gate_type,
      })),
      // Only show detailed progress for unlocked phases
      started_at: status !== "LOCKED" ? (phase?.started_at ?? null) : null,
      completed_at: status === "COMPLETE" ? (phase?.completed_at ?? null) : null,
    };
  });

  sendSuccess(res, 200, { phases: preview });
}

/** GET /ventures/:id/suggested-actions — Smart nudge suggestions */
export async function getSuggestedActions(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const venture = verifyVentureOwnership(req, res, params.id);
  if (!venture) return;

  const phases = ventureService.getPhases(venture.id);
  const activePhase = phases.find((p) => p.status === "ACTIVE") ?? phases[0];

  const actions = computeSuggestedActions(venture.id, activePhase.phase_number);
  sendSuccess(res, 200, { actions, phase_number: activePhase.phase_number });
}

export { computeSuggestedActions };
