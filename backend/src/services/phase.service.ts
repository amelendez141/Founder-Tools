import { getDb } from "../utils/database";
import { VentureService } from "./venture.service";
import type { Venture, Artifact, PhaseProgress, GateCriterion } from "../types";
import { PhaseStatus, ArtifactType } from "../types";
import type { PhaseConfig } from "../config/phase-seed";

// ── Phase gate evaluation logic ──
// Per architecture §6.3: each gate has specific validation rules.

interface GateEvaluationResult {
  passed: boolean;
  missing: Array<{ key: string; label: string }>;
  gate_criteria: GateCriterion[];
  /** Phase 5 only: true when all gates satisfied but phase loops (LOGIC-2) */
  cycle_complete?: boolean;
}

export class PhaseService {
  private ventureService: VentureService;

  constructor(ventureService?: VentureService) {
    this.ventureService = ventureService ?? new VentureService();
  }

  /** Seed phase config into the database (idempotent). */
  seedPhaseConfig(configs: PhaseConfig[]): void {
    const db = getDb();
    const now = new Date().toISOString();
    for (const config of configs) {
      db.exec(
        `INSERT OR REPLACE INTO phase_config
         (phase_number, name, description, original_sections, core_deliverable, guide_content, tool_recommendations, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          config.phase_number,
          config.name,
          config.description,
          config.original_sections,
          config.core_deliverable,
          config.guide_content,
          JSON.stringify(config.tool_recommendations),
          now,
        ]
      );
    }
  }

  /** Get all phase configs from the database. */
  getAllPhaseConfigs(): Array<{
    phase_number: number;
    name: string;
    description: string;
    original_sections: string;
    core_deliverable: string;
    guide_content: string;
    tool_recommendations: string[];
  }> {
    const db = getDb();
    const rows = db.query<Record<string, unknown>>(
      `SELECT * FROM phase_config ORDER BY phase_number`
    );
    return rows.map((row) => ({
      phase_number: row.phase_number as number,
      name: row.name as string,
      description: row.description as string,
      original_sections: row.original_sections as string,
      core_deliverable: row.core_deliverable as string,
      guide_content: row.guide_content as string,
      tool_recommendations: JSON.parse(
        (row.tool_recommendations as string) || "[]"
      ) as string[],
    }));
  }

  /** Get a single phase config. */
  getPhaseConfig(phaseNumber: number): {
    phase_number: number;
    name: string;
    description: string;
    original_sections: string;
    core_deliverable: string;
    guide_content: string;
    tool_recommendations: string[];
  } | null {
    const db = getDb();
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT * FROM phase_config WHERE phase_number = ?`,
      [phaseNumber]
    );
    if (!row) return null;
    return {
      phase_number: row.phase_number as number,
      name: row.name as string,
      description: row.description as string,
      original_sections: row.original_sections as string,
      core_deliverable: row.core_deliverable as string,
      guide_content: row.guide_content as string,
      tool_recommendations: JSON.parse(
        (row.tool_recommendations as string) || "[]"
      ) as string[],
    };
  }

  /**
   * Evaluate gate criteria for a specific phase.
   * Reads venture state + artifacts, computes pass/fail per gate criterion.
   * Updates the phase_progress record with current evaluation.
   *
   * LOGIC-1 fix: COMPLETE phases return cached criteria without overwriting.
   * LOGIC-2 fix: Phase 5 returns cycle_complete instead of passed.
   */
  evaluateGate(ventureId: string, phaseNumber: number): GateEvaluationResult {
    const venture = this.ventureService.findById(ventureId);
    if (!venture) {
      throw new Error("Venture not found");
    }

    const phases = this.ventureService.getPhases(ventureId);
    const phase = phases.find((p) => p.phase_number === phaseNumber);
    if (!phase) {
      throw new Error("Phase not found");
    }

    if (phase.status === PhaseStatus.LOCKED) {
      throw new Error("PHASE_LOCKED");
    }

    // LOGIC-1 fix: COMPLETE phases are immutable — return cached state
    if (phase.status === PhaseStatus.COMPLETE) {
      return {
        passed: true,
        missing: [],
        gate_criteria: phase.gate_criteria,
      };
    }

    const artifacts = this.ventureService.listArtifacts(ventureId);
    const criteria = this.computeGateCriteria(
      phaseNumber,
      venture,
      artifacts,
      phase
    );
    const missing = criteria.filter((c) => !c.satisfied);
    const passed = missing.length === 0;

    // Update the phase_progress record
    const db = getDb();
    db.exec(
      `UPDATE phase_progress SET gate_criteria = ?, gate_satisfied = ? WHERE venture_id = ? AND phase_number = ?`,
      [JSON.stringify(criteria), passed ? 1 : 0, ventureId, phaseNumber]
    );

    // If all gates pass, transition to COMPLETE and unlock next phase
    if (passed && phase.status === PhaseStatus.ACTIVE) {
      this.completePhase(ventureId, phaseNumber);
    }

    // LOGIC-2 fix: Phase 5 loops — signal cycle completion instead of "passed"
    const result: GateEvaluationResult = { passed, missing, gate_criteria: criteria };
    if (phaseNumber === 5 && passed) {
      result.cycle_complete = true;
    }
    return result;
  }

  /**
   * Force-unlock a phase (admin operation).
   * Per architecture §6.2: admin can force-unlock via endpoint.
   */
  forceUnlock(
    ventureId: string,
    phaseNumber: number,
    reason: string
  ): PhaseProgress | null {
    const db = getDb();
    const now = new Date().toISOString();

    // Verify the phase exists
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT * FROM phase_progress WHERE venture_id = ? AND phase_number = ?`,
      [ventureId, phaseNumber]
    );
    if (!row) return null;

    // Only unlock LOCKED phases
    if (row.status !== PhaseStatus.LOCKED) {
      return this.rowToPhaseProgress(row);
    }

    db.exec(
      `UPDATE phase_progress SET status = ?, started_at = ? WHERE venture_id = ? AND phase_number = ?`,
      [PhaseStatus.ACTIVE, now, ventureId, phaseNumber]
    );

    console.log(
      `[ADMIN] Force-unlocked Phase ${phaseNumber} for venture ${ventureId}: ${reason}`
    );

    const updated = db.queryOne<Record<string, unknown>>(
      `SELECT * FROM phase_progress WHERE venture_id = ? AND phase_number = ?`,
      [ventureId, phaseNumber]
    );
    return updated ? this.rowToPhaseProgress(updated) : null;
  }

  /**
   * Get full phase progress with config merged in.
   * Returns enriched phases with name, description, guide content, etc.
   */
  getEnrichedPhases(ventureId: string): Array<{
    phase_number: number;
    name: string;
    description: string;
    core_deliverable: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    gate_criteria: GateCriterion[];
    gate_satisfied: boolean;
    guide_content: string;
    tool_recommendations: string[];
  }> {
    const phases = this.ventureService.getPhases(ventureId);
    const configs = this.getAllPhaseConfigs();

    return phases.map((phase) => {
      const config = configs.find(
        (c) => c.phase_number === phase.phase_number
      );
      return {
        phase_number: phase.phase_number,
        name: config?.name ?? `Phase ${phase.phase_number}`,
        description: config?.description ?? "",
        core_deliverable: config?.core_deliverable ?? "",
        status: phase.status,
        started_at: phase.started_at,
        completed_at: phase.completed_at,
        gate_criteria: phase.gate_criteria,
        gate_satisfied: phase.gate_satisfied,
        guide_content: config?.guide_content ?? "",
        tool_recommendations: config?.tool_recommendations ?? [],
      };
    });
  }

  // ── Private Methods ──

  /**
   * Compute gate criteria satisfaction for a given phase.
   * Per architecture §6.3, each phase has specific validation rules.
   */
  private computeGateCriteria(
    phaseNumber: number,
    venture: Venture,
    artifacts: Artifact[],
    phase: { gate_criteria: GateCriterion[] }
  ): GateCriterion[] {
    switch (phaseNumber) {
      case 1:
        return this.evaluatePhase1Gates(venture, artifacts, phase);
      case 2:
        return this.evaluatePhase2Gates(venture, artifacts, phase);
      case 3:
        return this.evaluatePhase3Gates(venture, phase);
      case 4:
        return this.evaluatePhase4Gates(phase);
      case 5:
        return this.evaluatePhase5Gates(artifacts, phase);
      default:
        return phase.gate_criteria;
    }
  }

  private evaluatePhase1Gates(
    venture: Venture,
    artifacts: Artifact[],
    phase: { gate_criteria: GateCriterion[] }
  ): GateCriterion[] {
    // Gate 1.1: Problem statement ≥20 chars
    const problemSatisfied =
      !!venture.problem_statement &&
      venture.problem_statement.length >= 20;

    // Gate 1.2: ≥3 competitors identified via CUSTOMER_LIST artifact
    const competitorArtifacts = artifacts.filter(
      (a) =>
        a.type === ArtifactType.CUSTOMER_LIST && a.phase_number === 1
    );
    let competitorCount = 0;
    for (const art of competitorArtifacts) {
      const content = art.content;
      if (Array.isArray(content)) {
        competitorCount += content.length;
      } else if (
        typeof content === "object" &&
        content !== null
      ) {
        // Check for common array fields
        for (const val of Object.values(content)) {
          if (Array.isArray(val)) {
            competitorCount += val.length;
          }
        }
      }
    }
    const competitorsSatisfied = competitorCount >= 3;

    // Gate 1.3: ≥5 customer conversations — self-reported via gate_criteria
    const existingConversationGate = phase.gate_criteria.find(
      (g) => g.key === "customer_conversations"
    );
    const conversationsSatisfied =
      existingConversationGate?.satisfied ?? false;

    return [
      {
        key: "problem_statement",
        label: "Problem statement written (≥20 chars)",
        satisfied: problemSatisfied,
        gate_type: "auto" as const,
      },
      {
        key: "competitors_identified",
        label: "≥3 competitor/existing solutions identified",
        satisfied: competitorsSatisfied,
        gate_type: "auto" as const,
      },
      {
        key: "customer_conversations",
        label: "≥5 customer conversations logged",
        satisfied: conversationsSatisfied,
        gate_type: "self_reported" as const,
      },
    ];
  }

  private evaluatePhase2Gates(
    venture: Venture,
    artifacts: Artifact[],
    phase: { gate_criteria: GateCriterion[] }
  ): GateCriterion[] {
    // Gate 2.1: All 8 business plan fields populated
    const planFields = [
      venture.problem_statement,
      venture.solution_statement,
      venture.target_customer,
      venture.offer_description,
      venture.revenue_model,
      venture.distribution_channel,
      venture.estimated_costs,
      venture.advantage,
    ];
    const allFieldsPopulated = planFields.every(
      (f) => f !== null && f !== undefined && f !== ""
    );

    // Gate 2.2: Offer statement artifact exists
    const offerArtifact = artifacts.find(
      (a) =>
        a.type === ArtifactType.OFFER_STATEMENT && a.phase_number === 2
    );
    const offerSatisfied = !!offerArtifact;

    // Gate 2.3: Pricing set — self-reported or inferred from offer_description
    const existingPricingGate = phase.gate_criteria.find(
      (g) => g.key === "pricing_set"
    );
    const pricingSatisfied = existingPricingGate?.satisfied ?? false;

    return [
      {
        key: "business_plan_complete",
        label: "All 8 business plan fields populated",
        satisfied: allFieldsPopulated,
        gate_type: "auto" as const,
      },
      {
        key: "offer_statement",
        label: "Offer statement finalized",
        satisfied: offerSatisfied,
        gate_type: "auto" as const,
      },
      {
        key: "pricing_set",
        label: "Pricing set",
        satisfied: pricingSatisfied,
        gate_type: "self_reported" as const,
      },
    ];
  }

  private evaluatePhase3Gates(
    venture: Venture,
    phase: { gate_criteria: GateCriterion[] }
  ): GateCriterion[] {
    // Gate 3.1: Entity type chosen or explicitly skipped
    const entityChosen = venture.entity_type !== "NONE";
    const skipFlag = phase.gate_criteria.find(
      (g) => g.key === "entity_chosen"
    );
    const entitySatisfied = entityChosen || (skipFlag?.satisfied ?? false);

    // Gate 3.2: Bookkeeping method — self-reported
    const bookkeepingGate = phase.gate_criteria.find(
      (g) => g.key === "bookkeeping_selected"
    );
    const bookkeepingSatisfied = bookkeepingGate?.satisfied ?? false;

    // Gate 3.3: Bank account status logged (true OR false with reason)
    // The venture.bank_account_opened being explicitly set (either way) counts
    const bankGate = phase.gate_criteria.find(
      (g) => g.key === "bank_status_logged"
    );
    const bankSatisfied = bankGate?.satisfied ?? false;

    return [
      {
        key: "entity_chosen",
        label: "Entity type chosen or explicitly skipped",
        satisfied: entitySatisfied,
        gate_type: "auto" as const,
      },
      {
        key: "bookkeeping_selected",
        label: "Bookkeeping method selected",
        satisfied: bookkeepingSatisfied,
        gate_type: "self_reported" as const,
      },
      {
        key: "bank_status_logged",
        label: "Bank account status logged",
        satisfied: bankSatisfied,
        gate_type: "self_reported" as const,
      },
    ];
  }

  private evaluatePhase4Gates(phase: {
    gate_criteria: GateCriterion[];
  }): GateCriterion[] {
    // All Phase 4 gates are self-reported
    const getGate = (key: string): boolean => {
      const gate = phase.gate_criteria.find((g) => g.key === key);
      return gate?.satisfied ?? false;
    };

    return [
      {
        key: "distribution_active",
        label: "≥1 distribution channel active",
        satisfied: getGate("distribution_active"),
        gate_type: "self_reported" as const,
      },
      {
        key: "first_outreach",
        label: "First outreach sent",
        satisfied: getGate("first_outreach"),
        gate_type: "self_reported" as const,
      },
      {
        key: "first_customer",
        label: "≥1 customer acquired or ≥1 pre-sale",
        satisfied: getGate("first_customer"),
        gate_type: "self_reported" as const,
      },
    ];
  }

  private evaluatePhase5Gates(
    artifacts: Artifact[],
    phase: { gate_criteria: GateCriterion[] }
  ): GateCriterion[] {
    // Gate 5.1: Revenue > $0 — self-reported
    const revenueGate = phase.gate_criteria.find(
      (g) => g.key === "revenue_positive"
    );
    const revenueSatisfied = revenueGate?.satisfied ?? false;

    // Gate 5.2: 90-day growth plan generated
    const growthPlan = artifacts.find(
      (a) =>
        a.type === ArtifactType.GROWTH_PLAN && a.phase_number === 5
    );
    const growthSatisfied = !!growthPlan;

    return [
      {
        key: "revenue_positive",
        label: "Revenue > $0 (self-reported)",
        satisfied: revenueSatisfied,
        gate_type: "self_reported" as const,
      },
      {
        key: "growth_plan",
        label: "90-day growth plan generated",
        satisfied: growthSatisfied,
        gate_type: "auto" as const,
      },
    ];
  }

  /**
   * Transition a phase to COMPLETE and unlock the next phase.
   * Per architecture §6.2: transitions are forward-only.
   * Phase 5 has no COMPLETE state — it loops.
   */
  private completePhase(ventureId: string, phaseNumber: number): void {
    const db = getDb();
    const now = new Date().toISOString();

    // Phase 5 loops — never completes
    if (phaseNumber === 5) return;

    // EDGE-3 fix: Conditional UPDATE — only transition if still ACTIVE.
    // If two concurrent requests both try to complete, only the first succeeds.
    db.exec(
      `UPDATE phase_progress SET status = ?, completed_at = ? WHERE venture_id = ? AND phase_number = ? AND status = ?`,
      [PhaseStatus.COMPLETE, now, ventureId, phaseNumber, PhaseStatus.ACTIVE]
    );

    // Unlock next phase (also conditional — only if LOCKED)
    const nextPhase = phaseNumber + 1;
    if (nextPhase <= 5) {
      db.exec(
        `UPDATE phase_progress SET status = ?, started_at = ? WHERE venture_id = ? AND phase_number = ? AND status = ?`,
        [PhaseStatus.ACTIVE, now, ventureId, nextPhase, PhaseStatus.LOCKED]
      );
    }
  }

  /**
   * Update a single self-reported gate criterion.
   * Used for gates that can't be auto-evaluated (customer conversations, pricing, etc.)
   */
  updateGateCriterion(
    ventureId: string,
    phaseNumber: number,
    gateKey: string,
    satisfied: boolean
  ): GateCriterion[] {
    const db = getDb();

    const row = db.queryOne<Record<string, unknown>>(
      `SELECT gate_criteria FROM phase_progress WHERE venture_id = ? AND phase_number = ?`,
      [ventureId, phaseNumber]
    );
    if (!row) {
      throw new Error("Phase not found");
    }

    const criteria: GateCriterion[] = JSON.parse(
      (row.gate_criteria as string) || "[]"
    );
    const gate = criteria.find((g) => g.key === gateKey);
    if (!gate) {
      throw new Error(`Gate '${gateKey}' not found in phase ${phaseNumber}`);
    }

    gate.satisfied = satisfied;

    db.exec(
      `UPDATE phase_progress SET gate_criteria = ? WHERE venture_id = ? AND phase_number = ?`,
      [JSON.stringify(criteria), ventureId, phaseNumber]
    );

    return criteria;
  }

  private rowToPhaseProgress(row: Record<string, unknown>): PhaseProgress {
    return {
      id: row.id as string,
      venture_id: row.venture_id as string,
      phase_number: row.phase_number as number,
      status: row.status as PhaseStatus,
      started_at: (row.started_at as string) ?? null,
      completed_at: (row.completed_at as string) ?? null,
      gate_criteria: JSON.parse((row.gate_criteria as string) || "[]"),
      gate_satisfied: Boolean(row.gate_satisfied),
    };
  }
}
