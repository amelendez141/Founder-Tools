/**
 * Single source of truth for phase gate definitions (EDGE-5 fix).
 *
 * Used by:
 * - VentureService: to seed gate_criteria on venture creation
 * - PhaseService: to evaluate gates
 *
 * If you add/modify a gate, change it HERE and both consumers
 * automatically pick up the change.
 */

export interface GateDefinition {
  key: string;
  label: string;
  gate_type: "auto" | "self_reported";
}

export const GATE_DEFINITIONS: Record<number, GateDefinition[]> = {
  1: [
    { key: "problem_statement", label: "Problem statement written (≥20 chars)", gate_type: "auto" },
    { key: "competitors_identified", label: "≥3 competitor/existing solutions identified", gate_type: "auto" },
    { key: "customer_conversations", label: "≥5 customer conversations logged", gate_type: "self_reported" },
  ],
  2: [
    { key: "business_plan_complete", label: "All 8 business plan fields populated", gate_type: "auto" },
    { key: "offer_statement", label: "Offer statement finalized", gate_type: "auto" },
    { key: "pricing_set", label: "Pricing set", gate_type: "self_reported" },
  ],
  3: [
    { key: "entity_chosen", label: "Entity type chosen or explicitly skipped", gate_type: "auto" },
    { key: "bookkeeping_selected", label: "Bookkeeping method selected", gate_type: "self_reported" },
    { key: "bank_status_logged", label: "Bank account status logged", gate_type: "self_reported" },
  ],
  4: [
    { key: "distribution_active", label: "≥1 distribution channel active", gate_type: "self_reported" },
    { key: "first_outreach", label: "First outreach sent", gate_type: "self_reported" },
    { key: "first_customer", label: "≥1 customer acquired or ≥1 pre-sale", gate_type: "self_reported" },
  ],
  5: [
    { key: "revenue_positive", label: "Revenue > $0 (self-reported)", gate_type: "self_reported" },
    { key: "growth_plan", label: "90-day growth plan generated", gate_type: "auto" },
  ],
};
