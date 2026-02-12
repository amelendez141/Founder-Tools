/**
 * API Client for Founder Toolkit Backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface ApiResponse<T> {
  data: T;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  }

  setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  clearToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json();

    if (!response.ok) {
      const error = json as ApiError;
      throw new Error(error.error?.message ?? "Request failed");
    }

    return (json as ApiResponse<T>).data;
  }

  // Auth
  async register(email: string, password: string) {
    return this.request<{ jwt: string; user: User }>("POST", "/auth/register", {
      email,
      password,
    });
  }

  async login(email: string, password: string) {
    return this.request<{ jwt: string; user: User }>("POST", "/auth/login", {
      email,
      password,
    });
  }

  // Legacy auth methods (kept for backward compatibility)
  async createUser(email: string) {
    return this.request<{ id: string; email: string }>("POST", "/users", {
      email,
    });
  }

  async sendMagicLink(email: string) {
    return this.request<{ sent: boolean; _dev_token?: string }>(
      "POST",
      "/auth/magic-link",
      { email }
    );
  }

  async verifyToken(token: string) {
    return this.request<{ jwt: string; user: User }>("POST", "/auth/verify", {
      token,
    });
  }

  // Users
  async getUser(userId: string) {
    return this.request<User>("GET", `/users/${userId}`);
  }

  async updateIntake(userId: string, intake: IntakeData) {
    return this.request<User>("PUT", `/users/${userId}/intake`, intake);
  }

  async getUserVentures(userId: string) {
    return this.request<{ ventures: Venture[]; limit: number }>(
      "GET",
      `/users/${userId}/ventures`
    );
  }

  // Ventures
  async createVenture() {
    return this.request<Venture>("POST", "/ventures", {});
  }

  async getVenture(ventureId: string) {
    return this.request<{ venture: Venture; phases: PhaseProgress[]; artifact_count: number }>(
      "GET",
      `/ventures/${ventureId}`
    );
  }

  async updateVenture(ventureId: string, fields: Partial<Venture>) {
    return this.request<Venture>("PATCH", `/ventures/${ventureId}`, fields);
  }

  // Phases
  async getEnrichedPhases(ventureId: string) {
    const response = await this.request<{ phases: EnrichedPhase[] }>(
      "GET",
      `/ventures/${ventureId}/phases/enriched`
    );
    return response.phases;
  }

  async evaluateGate(ventureId: string, phaseNum: number) {
    return this.request<PhaseProgress>(
      "POST",
      `/ventures/${ventureId}/phases/${phaseNum}/gate`,
      {}
    );
  }

  async updateGate(ventureId: string, phaseNum: number, key: string, satisfied: boolean) {
    return this.request<PhaseProgress>(
      "PATCH",
      `/ventures/${ventureId}/phases/${phaseNum}/gate/${key}`,
      { satisfied }
    );
  }

  // AI Chat
  async chat(ventureId: string, message: string, phaseNumber: number) {
    return this.request<ChatResponse>("POST", `/ventures/${ventureId}/chat`, {
      message,
      phase_number: phaseNumber,
    });
  }

  async getChatHistory(ventureId: string, phaseNumber?: number) {
    const path = phaseNumber
      ? `/ventures/${ventureId}/chat/history?phase=${phaseNumber}`
      : `/ventures/${ventureId}/chat/history`;
    return this.request<{ messages: ChatMessage[] }>("GET", path);
  }

  async generateArtifact(
    ventureId: string,
    type: ArtifactType,
    phaseNumber: number
  ) {
    return this.request<Artifact>(
      "POST",
      `/ventures/${ventureId}/generate/${type}`,
      { phase_number: phaseNumber }
    );
  }

  async getRateLimit(ventureId: string) {
    return this.request<RateLimitStatus>(
      "GET",
      `/ventures/${ventureId}/rate-limit`
    );
  }

  // Dashboard
  async getDashboard(ventureId: string) {
    return this.request<DashboardData>(
      "GET",
      `/ventures/${ventureId}/dashboard`
    );
  }

  async getSuggestedActions(ventureId: string) {
    return this.request<{ actions: SuggestedAction[] }>(
      "GET",
      `/ventures/${ventureId}/suggested-actions`
    );
  }

  // Artifacts
  async getArtifacts(ventureId: string, phaseNumber?: number) {
    const path = phaseNumber
      ? `/ventures/${ventureId}/artifacts?phase=${phaseNumber}`
      : `/ventures/${ventureId}/artifacts`;
    const response = await this.request<{ artifacts: Artifact[] }>("GET", path);
    return response.artifacts;
  }

  async createArtifact(
    ventureId: string,
    phaseNumber: number,
    type: ArtifactType,
    content: Record<string, unknown>
  ) {
    return this.request<Artifact>("POST", `/ventures/${ventureId}/artifacts`, {
      phase_number: phaseNumber,
      type,
      content,
    });
  }

  async shareArtifact(ventureId: string, artifactId: string) {
    return this.request<{ slug: string }>(
      "POST",
      `/ventures/${ventureId}/artifacts/${artifactId}/share`,
      {}
    );
  }

  async unshareArtifact(ventureId: string, artifactId: string) {
    return this.request<{ success: boolean }>(
      "DELETE",
      `/ventures/${ventureId}/artifacts/${artifactId}/share`
    );
  }

  // Trial
  async createTrialSession() {
    return this.request<{ session_token: string }>(
      "POST",
      "/trial/session",
      {}
    );
  }

  async trialChat(sessionToken: string, message: string) {
    const response = await this.request<{ reply: string; remaining: number }>(
      "POST",
      "/trial/chat",
      { session_token: sessionToken, message }
    );
    return { message: response.reply, remaining: response.remaining };
  }

  async claimTrialSession(sessionToken: string) {
    return this.request<{ success: boolean }>("POST", "/trial/claim", {
      session_token: sessionToken,
    });
  }

  // Public
  async getPublicArtifact(slug: string) {
    return this.request<PublicArtifact>("GET", `/shared/${slug}`);
  }
}

// Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  experience_level: number | null;
  business_type: "ONLINE" | "LOCAL" | "HYBRID" | null;
  budget: number | null;
  income_goal: number | null;
  weekly_hours: number | null;
}

export interface IntakeData {
  experience_level: number;
  business_type: "ONLINE" | "LOCAL" | "HYBRID";
  budget: number;
  income_goal: number;
  weekly_hours: number;
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
  entity_type: "NONE" | "SOLE_PROP" | "LLC" | "CORP";
  created_at: string;
  updated_at: string;
}

export interface PhaseProgress {
  id: string;
  venture_id: string;
  phase_number: number;
  status: "LOCKED" | "ACTIVE" | "COMPLETE";
  started_at: string | null;
  completed_at: string | null;
  gate_criteria: GateCriterion[];
  gate_satisfied: boolean;
}

export interface GateCriterion {
  key: string;
  label: string;
  satisfied: boolean;
  gate_type?: "auto" | "self_reported";
}

export interface EnrichedPhase extends PhaseProgress {
  name: string;
  description: string;
  guide_content: string;
  tool_recommendations: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
  timestamp: string;
}

export type ArtifactType =
  | "BUSINESS_PLAN"
  | "OFFER_STATEMENT"
  | "GTM_PLAN"
  | "GROWTH_PLAN"
  | "CUSTOMER_LIST"
  | "CUSTOM";

export interface Artifact {
  id: string;
  venture_id: string;
  phase_number: number;
  type: ArtifactType;
  content: Record<string, unknown>;
  version: number;
  created_at: string;
}

export interface RateLimitStatus {
  messages_used: number;
  messages_limit: number;
  remaining_today: number;
  resets_at: string;
}

export interface DashboardData {
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
    type: string;
    message: string;
    gate_key?: string;
  };
  rate_limit: RateLimitStatus;
}

export interface SuggestedAction {
  type: string;
  message: string;
  gate_key?: string;
  artifact_type?: string;
}

export interface PublicArtifact {
  artifact: Artifact;
  venture_name: string | null;
  phase_name: string;
}

export const api = new ApiClient(API_URL);
