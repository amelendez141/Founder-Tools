/**
 * Anonymous Trial Chat Service
 *
 * Allows unauthenticated users to send up to 3 messages to the AI copilot
 * before requiring sign-up. Conversations are stored by session token and
 * can be claimed (migrated) to a real user account on sign-up.
 *
 * Product decision: 3 messages is enough to experience the AI value,
 * not enough to replace the full product.
 */

import { randomUUID, randomBytes } from "crypto";
import { getDb } from "../utils/database";
import { LLMProvider } from "./llm.provider";
import type { LLMModel } from "./llm.provider";
import type { ChatMessage } from "../types";

const ANONYMOUS_MESSAGE_LIMIT = 3;

export interface AnonymousChatResponse {
  reply: string;
  messages_used: number;
  messages_limit: number;
  remaining: number;
  session_token: string;
  model: string;
}

export interface AnonymousSession {
  id: string;
  session_token: string;
  messages_used: number;
  messages: ChatMessage[];
  created_at: string;
  claimed_by_user_id: string | null;
}

export class AnonymousChatService {
  private llm: LLMProvider;

  constructor(llm?: LLMProvider) {
    this.llm = llm ?? new LLMProvider();
  }

  /** Create a new anonymous session. Returns the session token. */
  createSession(): { session_token: string } {
    const db = getDb();
    const id = randomUUID();
    const token = randomBytes(16).toString("hex");
    const now = new Date().toISOString();

    db.exec(
      `INSERT INTO anonymous_sessions (id, session_token, messages_used, messages, created_at)
       VALUES (?, ?, 0, '[]', ?)`,
      [id, token, now]
    );

    return { session_token: token };
  }

  /** Get session by token. Returns null if not found. */
  getSession(sessionToken: string): AnonymousSession | null {
    const db = getDb();
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT * FROM anonymous_sessions WHERE session_token = ?`,
      [sessionToken]
    );
    if (!row) return null;

    return {
      id: row.id as string,
      session_token: row.session_token as string,
      messages_used: row.messages_used as number,
      messages: JSON.parse((row.messages as string) || "[]") as ChatMessage[],
      created_at: row.created_at as string,
      claimed_by_user_id: (row.claimed_by_user_id as string) ?? null,
    };
  }

  /** Send a chat message as an anonymous user. */
  async chat(sessionToken: string, userMessage: string): Promise<AnonymousChatResponse> {
    const session = this.getSession(sessionToken);
    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    if (session.claimed_by_user_id) {
      throw new Error("SESSION_CLAIMED: This trial session has been linked to an account. Please sign in.");
    }

    if (session.messages_used >= ANONYMOUS_MESSAGE_LIMIT) {
      throw new Error("TRIAL_LIMIT_REACHED");
    }

    const now = new Date().toISOString();
    const messages = [...session.messages];
    messages.push({ role: "user", content: userMessage, timestamp: now });

    // Build a lightweight system prompt for anonymous users
    const systemPrompt = `You are an AI entrepreneurship coach helping a potential user explore the platform. 
You are friendly, encouraging, and focused on helping them think about their business idea.
This is a trial conversation — the user hasn't signed up yet. Be helpful and show the value 
of having an AI coach for their entrepreneurial journey. Keep responses concise (2-3 paragraphs max).
After giving helpful advice, you can mention that signing up gives them access to structured phases, 
artifact generation, and a personalized business plan — but don't be pushy about it.`;

    const llmMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await this.llm.complete({
      systemPrompt,
      messages: llmMessages,
      model: "haiku" as LLMModel,
      maxTokens: 512,
    });

    messages.push({
      role: "assistant",
      content: response.content,
      timestamp: new Date().toISOString(),
    });

    const newUsed = session.messages_used + 1;

    // Update session
    const db = getDb();
    db.exec(
      `UPDATE anonymous_sessions SET messages_used = ?, messages = ? WHERE session_token = ?`,
      [newUsed, JSON.stringify(messages), sessionToken]
    );

    return {
      reply: response.content,
      messages_used: newUsed,
      messages_limit: ANONYMOUS_MESSAGE_LIMIT,
      remaining: Math.max(0, ANONYMOUS_MESSAGE_LIMIT - newUsed),
      session_token: sessionToken,
      model: response.model,
    };
  }

  /** Get the current status of a trial session. */
  getStatus(sessionToken: string): {
    messages_used: number;
    messages_limit: number;
    remaining: number;
    messages: ChatMessage[];
    claimed: boolean;
  } | null {
    const session = this.getSession(sessionToken);
    if (!session) return null;

    return {
      messages_used: session.messages_used,
      messages_limit: ANONYMOUS_MESSAGE_LIMIT,
      remaining: Math.max(0, ANONYMOUS_MESSAGE_LIMIT - session.messages_used),
      messages: session.messages,
      claimed: session.claimed_by_user_id !== null,
    };
  }

  /**
   * Claim an anonymous session — link it to a real user account.
   * This migrates the trial conversation so the user doesn't lose context.
   */
  claimSession(sessionToken: string, userId: string): boolean {
    const db = getDb();
    const session = this.getSession(sessionToken);
    if (!session) return false;

    // Already claimed
    if (session.claimed_by_user_id) {
      return session.claimed_by_user_id === userId;
    }

    const now = new Date().toISOString();
    db.exec(
      `UPDATE anonymous_sessions SET claimed_by_user_id = ?, claimed_at = ? WHERE session_token = ?`,
      [userId, now, sessionToken]
    );

    return true;
  }
}
