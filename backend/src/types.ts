// ── Enums ──

export enum BusinessType {
  ONLINE = "ONLINE",
  LOCAL = "LOCAL",
  HYBRID = "HYBRID",
}

export enum EntityType {
  NONE = "NONE",
  SOLE_PROP = "SOLE_PROP",
  LLC = "LLC",
  CORP = "CORP",
}

export enum PhaseStatus {
  LOCKED = "LOCKED",
  ACTIVE = "ACTIVE",
  COMPLETE = "COMPLETE",
}

export enum ArtifactType {
  BUSINESS_PLAN = "BUSINESS_PLAN",
  OFFER_STATEMENT = "OFFER_STATEMENT",
  BRAND_BRIEF = "BRAND_BRIEF",
  FINANCIAL_SHEET = "FINANCIAL_SHEET",
  CUSTOMER_LIST = "CUSTOMER_LIST",
  GTM_PLAN = "GTM_PLAN",
  GROWTH_PLAN = "GROWTH_PLAN",
  CUSTOM = "CUSTOM",
}

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  RATE_LIMITED = "RATE_LIMITED",
  LLM_UNAVAILABLE = "LLM_UNAVAILABLE",
  CONFLICT = "CONFLICT",
  PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE",
  INTERNAL = "INTERNAL",
}

// ── Data Models ──

export interface User {
  id: string;
  email: string;
  created_at: string;
  experience_level: number | null;
  business_type: BusinessType | null;
  budget: number | null;
  income_goal: number | null;
  weekly_hours: number | null;
}

export interface Venture {
  id: string;
  user_id: string;
  name: string | null;
  problem_statement: string | null;
  solution_statement: string | null;
  target_customer: string | null;
  offer_description: string | null;
  revenue_model: string | null;
  distribution_channel: string | null;
  estimated_costs: { startup: number; monthly: number } | null;
  advantage: string | null;
  entity_type: EntityType;
  entity_state: string | null;
  ein_obtained: boolean;
  bank_account_opened: boolean;
  created_at: string;
  updated_at: string;
}

export interface GateCriterion {
  key: string;
  label: string;
  satisfied: boolean;
  /** UX-3: Indicates whether the system auto-evaluates this gate or the user self-reports it */
  gate_type?: "auto" | "self_reported";
}

export interface PhaseProgress {
  id: string;
  venture_id: string;
  phase_number: number;
  status: PhaseStatus;
  started_at: string | null;
  completed_at: string | null;
  gate_criteria: GateCriterion[];
  gate_satisfied: boolean;
}

export interface Artifact {
  id: string;
  venture_id: string;
  phase_number: number;
  type: ArtifactType;
  content: Record<string, unknown>;
  version: number;
  created_at: string;
}

export interface MagicLinkToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  venture_id: string;
  phase_number: number;
  messages: ChatMessage[];
  system_prompt_hash: string;
  created_at: string;
}

export interface RateLimitStatus {
  messages_used: number;
  messages_limit: number;
  remaining_today: number;
  resets_at: string;
}

// ── API Request/Response Types ──

export interface CreateUserRequest {
  email: string;
}

export interface IntakeRequest {
  experience_level: number;
  business_type: BusinessType;
  budget: number;
  income_goal: number;
  weekly_hours: number;
}

export interface MagicLinkRequest {
  email: string;
}

export interface VerifyTokenRequest {
  token: string;
}

export interface UpdateVentureRequest {
  name?: string;
  problem_statement?: string;
  solution_statement?: string;
  target_customer?: string;
  offer_description?: string;
  revenue_model?: string;
  distribution_channel?: string;
  estimated_costs?: { startup: number; monthly: number };
  advantage?: string;
  entity_type?: EntityType;
  entity_state?: string;
  ein_obtained?: boolean;
  bank_account_opened?: boolean;
}

export interface CreateArtifactRequest {
  phase_number: number;
  type: ArtifactType;
  content: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiSuccess<T> {
  data: T;
}

// ── UX Feature Types ──

export interface DashboardResponse {
  venture_id: string;
  venture_name: string | null;
  current_phase: number;
  current_phase_name: string;
  overall_progress: {
    phases_completed: number;
    total_phases: number;
    percentage: number;
  };
  current_phase_progress: {
    gates_satisfied: number;
    total_gates: number;
    percentage: number;
  };
  artifacts_generated: number;
  days_active: number;
  streak: {
    current_days: number;
    last_active_date: string | null;
  };
  next_action: {
    type: "complete_gate" | "generate_artifact" | "advance_phase" | "keep_going" | "explore_phase" | "chat_tip";
    message: string;
    gate_key?: string;
  };
  rate_limit: RateLimitStatus;
}

export interface SuggestedAction {
  type: "complete_gate" | "generate_artifact" | "advance_phase" | "explore_phase" | "chat_tip";
  message: string;
  gate_key?: string;
  artifact_type?: string;
}

export interface PublicArtifactResponse {
  artifact: {
    id: string;
    type: ArtifactType;
    content: Record<string, unknown>;
    version: number;
    created_at: string;
  };
  venture_name: string | null;
  phase_name: string;
}
