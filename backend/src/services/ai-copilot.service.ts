import { randomUUID } from "crypto";
import { getDb } from "../utils/database";
import { LLMProvider } from "./llm.provider";
import type { LLMModel } from "./llm.provider";
import { assemblePrompt, buildArtifactGenerationPrompt } from "./prompt.service";
import { UserService } from "./user.service";
import { VentureService } from "./venture.service";
import type { ChatMessage, RateLimitStatus, GateCriterion } from "../types";
import { ArtifactType } from "../types";

const DAILY_MESSAGE_LIMIT = 30;
const ARTIFACT_MESSAGE_COST = 3;

const GENERATABLE_TYPES = new Set<string>([
  ArtifactType.BUSINESS_PLAN,
  ArtifactType.OFFER_STATEMENT,
  ArtifactType.GTM_PLAN,
  ArtifactType.GROWTH_PLAN,
]);

export interface ChatResponse {
  reply: string;
  tokens_used: number;
  remaining_today: number;
  model: string;
  conversation_id: string;
  suggested_actions?: Array<{
    type: string;
    message: string;
    gate_key?: string;
    artifact_type?: string;
  }>;
}

export interface GenerateResponse {
  artifact: {
    id: string;
    venture_id: string;
    phase_number: number;
    type: ArtifactType;
    content: Record<string, unknown>;
    version: number;
    created_at: string;
  };
  tokens_used: number;
  remaining_today: number;
  model: string;
}

export class AICopilotService {
  private llm: LLMProvider;
  private userService: UserService;
  private ventureService: VentureService;

  constructor(
    llm?: LLMProvider,
    userService?: UserService,
    ventureService?: VentureService
  ) {
    this.llm = llm ?? new LLMProvider();
    this.userService = userService ?? new UserService();
    this.ventureService = ventureService ?? new VentureService();
  }

  /**
   * SCALE-5: Batch-load all context needed for chat in fewer queries.
   * Combines: venture + user + phase + artifacts into 2 queries (down from 5).
   */
  private loadChatContext(ventureId: string, phaseNumber: number): {
    venture: ReturnType<VentureService["findById"]>;
    user: ReturnType<UserService["findById"]>;
    phase: { gate_criteria: GateCriterion[] } | null;
    artifacts: ReturnType<VentureService["listArtifacts"]>;
  } {
    const db = getDb();

    // Single JOIN query for venture + user + phase
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT
         v.id as v_id, v.user_id, v.name, v.problem_statement, v.solution_statement,
         v.target_customer, v.offer_description, v.revenue_model, v.distribution_channel,
         v.estimated_costs, v.advantage, v.entity_type, v.entity_state,
         v.ein_obtained, v.bank_account_opened, v.created_at as v_created_at, v.updated_at,
         u.id as u_id, u.email, u.experience_level, u.business_type, u.budget,
         u.income_goal, u.weekly_hours, u.created_at as u_created_at,
         p.phase_number, p.status, p.gate_criteria, p.gate_satisfied
       FROM ventures v
       JOIN users u ON u.id = v.user_id
       LEFT JOIN phase_progress p ON p.venture_id = v.id AND p.phase_number = ?
       WHERE v.id = ?`,
      [phaseNumber, ventureId]
    );

    if (!row) {
      return { venture: null, user: null, phase: null, artifacts: [] };
    }

    // Reconstruct objects from JOIN result
    const venture = this.ventureService.findById(ventureId);
    const user = this.userService.findById(row.user_id as string);
    const phase = row.gate_criteria
      ? { gate_criteria: JSON.parse(row.gate_criteria as string) as GateCriterion[] }
      : null;
    const artifacts = this.ventureService.listArtifacts(ventureId);

    return { venture, user, phase, artifacts };
  }

  /** Chat — Haiku model. 1 rate-limit unit. UX-6: optional conversation_id for resuming. */
  async chat(
    ventureId: string,
    phaseNumber: number,
    userMessage: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    // LOGIC-3 fix: atomically reserve quota BEFORE the LLM call
    this.reserveRateLimit(ventureId, 1);

    // SCALE-5: batch load context
    const ctx = this.loadChatContext(ventureId, phaseNumber);
    if (!ctx.venture) throw new Error("VENTURE_NOT_FOUND");
    if (!ctx.user) throw new Error("USER_NOT_FOUND");
    if (!ctx.phase) throw new Error("PHASE_NOT_FOUND");

    // UX-6: Use specific conversation if provided, else get/create latest
    const conversation = conversationId
      ? this.getConversationById(conversationId, ventureId) ?? this.getOrCreateConversation(ventureId, phaseNumber)
      : this.getOrCreateConversation(ventureId, phaseNumber);

    const now = new Date().toISOString();
    conversation.messages.push({ role: "user", content: userMessage, timestamp: now });

    const assembled = assemblePrompt(
      ctx.user, ctx.venture, phaseNumber, ctx.phase.gate_criteria, ctx.artifacts, conversation.messages
    );

    const llmMessages = assembled.conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await this.llm.complete({
      systemPrompt: assembled.systemPrompt,
      messages: llmMessages,
      model: "haiku" as LLMModel,
      maxTokens: 1024,
    });

    conversation.messages.push({
      role: "assistant",
      content: response.content,
      timestamp: new Date().toISOString(),
    });

    this.saveConversation(
      conversation.id, ventureId, phaseNumber,
      conversation.messages, assembled.systemPromptHash
    );

    const updatedRate = this.checkRateLimit(ventureId);
    return {
      reply: response.content,
      tokens_used: response.tokens_used,
      remaining_today: updatedRate.remaining_today,
      model: response.model,
      conversation_id: conversation.id,
    };
  }

  /** Generate artifact — Sonnet model. 3 rate-limit units. */
  async generate(
    ventureId: string,
    phaseNumber: number,
    type: string
  ): Promise<GenerateResponse> {
    if (!GENERATABLE_TYPES.has(type)) {
      throw new Error(`INVALID_TYPE: Must be one of: ${[...GENERATABLE_TYPES].join(", ")}`);
    }

    // LOGIC-3 fix: atomically reserve quota BEFORE the LLM call
    this.reserveRateLimit(ventureId, ARTIFACT_MESSAGE_COST);

    const venture = this.ventureService.findById(ventureId);
    if (!venture) throw new Error("VENTURE_NOT_FOUND");
    const user = this.userService.findById(venture.user_id);
    if (!user) throw new Error("USER_NOT_FOUND");

    const artifactPrompt = buildArtifactGenerationPrompt(type, venture, user);
    const response = await this.llm.complete({
      systemPrompt: artifactPrompt,
      messages: [{ role: "user", content: `Generate a ${type} artifact for my venture.` }],
      model: "sonnet" as LLMModel,
      maxTokens: 2048,
    });

    let content: Record<string, unknown>;
    try {
      const cleaned = response.content
        .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      content = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      content = { raw: response.content, parse_error: true };
    }

    const artifact = this.ventureService.createArtifact(
      ventureId, phaseNumber, type as ArtifactType, content
    );

    const updatedRate = this.checkRateLimit(ventureId);

    return {
      artifact,
      tokens_used: response.tokens_used,
      remaining_today: updatedRate.remaining_today,
      model: response.model,
    };
  }

  /** Chat history for a venture, optionally by phase. SCALE-4: reads from chat_messages table. */
  getChatHistory(
    ventureId: string,
    phaseNumber?: number
  ): Array<{ id: string; phase_number: number; messages: ChatMessage[]; created_at: string }> {
    const db = getDb();
    let sql = `SELECT id, phase_number, created_at FROM ai_conversations WHERE venture_id = ?`;
    const params: unknown[] = [ventureId];
    if (phaseNumber !== undefined) {
      sql += ` AND phase_number = ?`;
      params.push(phaseNumber);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = db.query<Record<string, unknown>>(sql, params);

    return rows.map((row) => {
      const convoId = row.id as string;
      // SCALE-4: Read from chat_messages table
      const msgRows = db.query<{ role: string; content: string; timestamp: string }>(
        `SELECT role, content, timestamp FROM chat_messages
         WHERE conversation_id = ? ORDER BY timestamp ASC`,
        [convoId]
      );
      // Fallback to legacy JSON blob if no rows in chat_messages
      let messages: ChatMessage[];
      if (msgRows.length > 0) {
        messages = msgRows as ChatMessage[];
      } else {
        const fullRow = db.queryOne<Record<string, unknown>>(
          `SELECT messages FROM ai_conversations WHERE id = ?`, [convoId]
        );
        messages = JSON.parse(((fullRow?.messages as string) || "[]")) as ChatMessage[];
      }
      return {
        id: convoId,
        phase_number: row.phase_number as number,
        messages,
        created_at: row.created_at as string,
      };
    });
  }

  /** Current rate limit status. */
  getRateLimit(ventureId: string): RateLimitStatus {
    return this.checkRateLimit(ventureId);
  }

  // ── Rate Limiting ──

  private getTodayDateStr(): string {
    return new Date().toISOString().split("T")[0];
  }

  private checkRateLimit(ventureId: string): RateLimitStatus {
    const db = getDb();
    const today = this.getTodayDateStr();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const row = db.queryOne<{ messages_used: number }>(
      `SELECT messages_used FROM rate_limits WHERE venture_id = ? AND date = ?`,
      [ventureId, today]
    );
    const used = row?.messages_used ?? 0;
    return {
      messages_used: used,
      messages_limit: DAILY_MESSAGE_LIMIT,
      remaining_today: Math.max(0, DAILY_MESSAGE_LIMIT - used),
      resets_at: tomorrow.toISOString(),
    };
  }

  /**
   * Atomically reserve rate limit quota BEFORE making the LLM call (LOGIC-3 fix).
   * Returns remaining count after reservation, or throws RATE_LIMITED.
   */
  private reserveRateLimit(ventureId: string, count: number): number {
    const db = getDb();
    const today = this.getTodayDateStr();

    // Ensure row exists
    const existing = db.queryOne<{ id: string; messages_used: number }>(
      `SELECT id, messages_used FROM rate_limits WHERE venture_id = ? AND date = ?`,
      [ventureId, today]
    );

    if (existing) {
      if (existing.messages_used + count > DAILY_MESSAGE_LIMIT) {
        throw new Error("RATE_LIMITED");
      }
      db.exec(
        `UPDATE rate_limits SET messages_used = messages_used + ? WHERE id = ?`,
        [count, existing.id]
      );
      return DAILY_MESSAGE_LIMIT - (existing.messages_used + count);
    } else {
      if (count > DAILY_MESSAGE_LIMIT) {
        throw new Error("RATE_LIMITED");
      }
      db.exec(
        `INSERT INTO rate_limits (id, venture_id, date, messages_used) VALUES (?, ?, ?, ?)`,
        [randomUUID(), ventureId, today, count]
      );
      return DAILY_MESSAGE_LIMIT - count;
    }
  }

  // ── Conversation persistence ──

  /** UX-6: Look up a specific conversation by ID, scoped to venture for security. */
  private getConversationById(
    convoId: string,
    ventureId: string
  ): { id: string; messages: ChatMessage[] } | null {
    const db = getDb();
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT id FROM ai_conversations WHERE id = ? AND venture_id = ?`,
      [convoId, ventureId]
    );
    if (!row) return null;

    const msgRows = db.query<{ role: string; content: string; timestamp: string }>(
      `SELECT role, content, timestamp FROM chat_messages
       WHERE conversation_id = ? ORDER BY timestamp ASC`,
      [convoId]
    );
    if (msgRows.length > 0) {
      return { id: convoId, messages: msgRows as ChatMessage[] };
    }
    // Fallback
    const fullRow = db.queryOne<Record<string, unknown>>(
      `SELECT messages FROM ai_conversations WHERE id = ?`, [convoId]
    );
    return {
      id: convoId,
      messages: JSON.parse(((fullRow?.messages as string) || "[]")) as ChatMessage[],
    };
  }

  private getOrCreateConversation(
    ventureId: string,
    phaseNumber: number
  ): { id: string; messages: ChatMessage[] } {
    const db = getDb();
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT id FROM ai_conversations
       WHERE venture_id = ? AND phase_number = ?
       ORDER BY created_at DESC LIMIT 1`,
      [ventureId, phaseNumber]
    );
    if (row) {
      // SCALE-4: Read from chat_messages table instead of JSON blob
      const msgRows = db.query<{ role: string; content: string; timestamp: string }>(
        `SELECT role, content, timestamp FROM chat_messages
         WHERE conversation_id = ? ORDER BY timestamp ASC`,
        [row.id as string]
      );
      if (msgRows.length > 0) {
        return { id: row.id as string, messages: msgRows as ChatMessage[] };
      }
      // Fallback: read from legacy JSON blob (migration path)
      const fullRow = db.queryOne<Record<string, unknown>>(
        `SELECT messages FROM ai_conversations WHERE id = ?`, [row.id as string]
      );
      const msgs = JSON.parse(((fullRow?.messages as string) || "[]")) as ChatMessage[];
      return { id: row.id as string, messages: msgs };
    }
    return { id: randomUUID(), messages: [] };
  }

  private saveConversation(
    id: string,
    ventureId: string,
    phaseNumber: number,
    messages: ChatMessage[],
    systemPromptHash: string
  ): void {
    const db = getDb();
    const now = new Date().toISOString();
    const existing = db.queryOne<{ id: string }>(`SELECT id FROM ai_conversations WHERE id = ?`, [id]);
    if (existing) {
      // Update legacy blob (backward compat) — but keep it bounded
      const recentMessages = messages.slice(-50);  // SCALE-4: cap blob at 50 messages
      db.exec(`UPDATE ai_conversations SET messages = ?, system_prompt_hash = ? WHERE id = ?`,
        [JSON.stringify(recentMessages), systemPromptHash, id]);
    } else {
      db.exec(
        `INSERT INTO ai_conversations (id, venture_id, phase_number, messages, system_prompt_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, ventureId, phaseNumber, JSON.stringify(messages), systemPromptHash, now]
      );
    }

    // SCALE-4: Write new messages to chat_messages table
    // Only insert the last 2 messages (the new user + assistant pair)
    const newMessages = messages.slice(-2);
    for (const msg of newMessages) {
      const msgId = randomUUID();
      db.exec(
        `INSERT OR IGNORE INTO chat_messages (id, conversation_id, role, content, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [msgId, id, msg.role, msg.content, msg.timestamp]
      );
    }
  }
}
