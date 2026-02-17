import { randomUUID } from "crypto";
import { getDb } from "../utils/database";
import type { Venture, Artifact } from "../types";
import { EntityType, ArtifactType, PhaseStatus } from "../types";
import { GATE_DEFINITIONS } from "../config/gate-definitions";

// Free tier: Allow up to 10 ventures per user
export const MAX_VENTURES_PER_USER = 10;

export class VentureService {
  /** Create a new venture for a user. Initializes 5 phase_progress rows. */
  createVenture(userId: string): Venture {
    const db = getDb();

    // V2: Allow up to 10 ventures per user (free tier)
    const existingCount = db.queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM ventures WHERE user_id = ?`,
      [userId]
    );
    if (existingCount && existingCount.cnt >= MAX_VENTURES_PER_USER) {
      throw new Error(`VENTURE_LIMIT: Maximum ${MAX_VENTURES_PER_USER} ventures per user`);
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.exec(
      `INSERT INTO ventures (id, user_id, entity_type, ein_obtained, bank_account_opened, created_at, updated_at)
       VALUES (?, ?, 'NONE', 0, 0, ?, ?)`,
      [id, userId, now, now]
    );

    // Create phase_progress rows using shared gate definitions (EDGE-5)
    for (let phase = 1; phase <= 5; phase++) {
      const phaseId = randomUUID();
      const status = phase === 1 ? PhaseStatus.ACTIVE : PhaseStatus.LOCKED;
      const startedAt = phase === 1 ? now : null;
      const gateCriteria = (GATE_DEFINITIONS[phase] ?? []).map((g) => ({
        ...g,
        satisfied: false,
      }));

      db.exec(
        `INSERT INTO phase_progress (id, venture_id, phase_number, status, started_at, gate_criteria, gate_satisfied)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [phaseId, id, phase, status, startedAt, JSON.stringify(gateCriteria)]
      );
    }

    return this.findById(id)!;
  }

  /** Find venture by ID. */
  findById(id: string): Venture | null {
    const db = getDb();
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT * FROM ventures WHERE id = ?`,
      [id]
    );
    if (!row) return null;
    return this.rowToVenture(row);
  }

  /** Find venture by user ID (returns first/only venture — backward compat). */
  findByUserId(userId: string): Venture | null {
    const db = getDb();
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT * FROM ventures WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
      [userId]
    );
    if (!row) return null;
    return this.rowToVenture(row);
  }

  /** List all ventures for a user (V2: multi-venture support). */
  listByUserId(userId: string): Venture[] {
    const db = getDb();
    const rows = db.query<Record<string, unknown>>(
      `SELECT * FROM ventures WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map((row) => this.rowToVenture(row));
  }

  // SEC-3 fix: compile-time allowlist of valid column names for UPDATE
  private static readonly ALLOWED_UPDATE_COLUMNS = new Set([
    "name", "problem_statement", "solution_statement", "target_customer",
    "offer_description", "revenue_model", "distribution_channel",
    "estimated_costs", "advantage", "entity_type", "entity_state",
    "ein_obtained", "bank_account_opened",
  ] as const);

  /** Partial update of venture fields. */
  updateVenture(id: string, fields: Record<string, unknown>): Venture | null {
    const db = getDb();
    const now = new Date().toISOString();

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(fields)) {
      // SEC-3 fix: reject any column not in allowlist (defense in depth)
      if (!VentureService.ALLOWED_UPDATE_COLUMNS.has(key as never)) {
        throw new Error(`Invalid update field: ${key}`);
      }
      if (key === "estimated_costs") {
        setClauses.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else if (typeof value === "boolean") {
        setClauses.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    setClauses.push("updated_at = ?");
    values.push(now);
    values.push(id);

    db.exec(
      `UPDATE ventures SET ${setClauses.join(", ")} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /** Get all phases for a venture. */
  getPhases(ventureId: string): Array<{
    phase_number: number;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    gate_criteria: Array<{ key: string; label: string; satisfied: boolean; gate_type?: "auto" | "self_reported" }>;
    gate_satisfied: boolean;
  }> {
    const db = getDb();
    const rows = db.query<Record<string, unknown>>(
      `SELECT * FROM phase_progress WHERE venture_id = ? ORDER BY phase_number`,
      [ventureId]
    );

    return rows.map((row) => ({
      phase_number: row.phase_number as number,
      status: row.status as string,
      started_at: (row.started_at as string) ?? null,
      completed_at: (row.completed_at as string) ?? null,
      gate_criteria: JSON.parse((row.gate_criteria as string) || "[]"),
      gate_satisfied: Boolean(row.gate_satisfied),
    }));
  }

  /** List artifacts for a venture, optionally filtered by phase and type. */
  listArtifacts(
    ventureId: string,
    phase?: number,
    type?: string
  ): Artifact[] {
    const db = getDb();
    let sql = `SELECT * FROM artifacts WHERE venture_id = ?`;
    const params: unknown[] = [ventureId];

    if (phase !== undefined) {
      sql += ` AND phase_number = ?`;
      params.push(phase);
    }
    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY created_at DESC`;

    const rows = db.query<Record<string, unknown>>(sql, params);
    return rows.map((row) => this.rowToArtifact(row));
  }

  /** Create a new artifact. */
  createArtifact(
    ventureId: string,
    phaseNumber: number,
    type: ArtifactType,
    content: Record<string, unknown>
  ): Artifact {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    // EDGE-7: Validate type before hitting DB CHECK constraint
    const validTypes = Object.values(ArtifactType);
    if (!validTypes.includes(type)) {
      throw new Error(`VALIDATION: Invalid artifact type: ${type}. Must be one of: ${validTypes.join(", ")}`);
    }

    db.exec(
      `INSERT INTO artifacts (id, venture_id, phase_number, type, content, version, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [id, ventureId, phaseNumber, type, JSON.stringify(content), now]
    );

    return {
      id,
      venture_id: ventureId,
      phase_number: phaseNumber,
      type,
      content,
      version: 1,
      created_at: now,
    };
  }

  /** Update an artifact (increments version). Scoped to ventureId for security (EDGE-2). */
  updateArtifact(
    artifactId: string,
    content: Record<string, unknown>,
    ventureId?: string
  ): Artifact | null {
    const db = getDb();

    // EDGE-2 fix: scope lookup to the venture that owns the artifact
    const sql = ventureId
      ? `SELECT * FROM artifacts WHERE id = ? AND venture_id = ?`
      : `SELECT * FROM artifacts WHERE id = ?`;
    const params: unknown[] = ventureId ? [artifactId, ventureId] : [artifactId];

    const existing = db.queryOne<Record<string, unknown>>(sql, params);
    if (!existing) return null;

    const oldVersion = existing.version as number;
    const newVersion = oldVersion + 1;

    // UX-5: Save previous version to artifact_versions before overwriting
    db.exec(
      `INSERT INTO artifact_versions (id, artifact_id, version, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), artifactId, oldVersion, existing.content as string, new Date().toISOString()]
    );

    db.exec(
      `UPDATE artifacts SET content = ?, version = ? WHERE id = ?`,
      [JSON.stringify(content), newVersion, artifactId]
    );

    return this.rowToArtifact({
      ...existing,
      content: JSON.stringify(content),
      version: newVersion,
    });
  }

  // ── Private Helpers ──

  private rowToVenture(row: Record<string, unknown>): Venture {
    let estimatedCosts: { startup: number; monthly: number } | null = null;
    if (row.estimated_costs && typeof row.estimated_costs === "string") {
      try {
        estimatedCosts = JSON.parse(row.estimated_costs);
      } catch {
        estimatedCosts = null;
      }
    }

    return {
      id: row.id as string,
      user_id: row.user_id as string,
      name: (row.name as string) ?? null,
      problem_statement: (row.problem_statement as string) ?? null,
      solution_statement: (row.solution_statement as string) ?? null,
      target_customer: (row.target_customer as string) ?? null,
      offer_description: (row.offer_description as string) ?? null,
      revenue_model: (row.revenue_model as string) ?? null,
      distribution_channel: (row.distribution_channel as string) ?? null,
      estimated_costs: estimatedCosts,
      advantage: (row.advantage as string) ?? null,
      entity_type: (row.entity_type as EntityType) ?? EntityType.NONE,
      entity_state: (row.entity_state as string) ?? null,
      ein_obtained: Boolean(row.ein_obtained),
      bank_account_opened: Boolean(row.bank_account_opened),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  private rowToArtifact(row: Record<string, unknown>): Artifact {
    let content: Record<string, unknown> = {};
    if (typeof row.content === "string") {
      try {
        content = JSON.parse(row.content);
      } catch {
        // EDGE-1 fix: preserve raw content instead of silently returning empty object
        content = { _raw: row.content, _parse_error: true };
        console.error(`[WARN] Failed to parse artifact content for id=${row.id}`);
      }
    }

    return {
      id: row.id as string,
      venture_id: row.venture_id as string,
      phase_number: row.phase_number as number,
      type: row.type as ArtifactType,
      content,
      version: row.version as number,
      created_at: row.created_at as string,
    };
  }

  // ── UX Features ──

  /** Generate a unique public slug for an artifact and return it. */
  makeArtifactPublic(artifactId: string, ventureId: string): string | null {
    const db = getDb();
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT id, public_slug FROM artifacts WHERE id = ? AND venture_id = ?`,
      [artifactId, ventureId]
    );
    if (!row) return null;

    // Already has a slug
    if (row.public_slug) return row.public_slug as string;

    // Generate a short, URL-safe slug
    const slug = randomUUID().replace(/-/g, "").slice(0, 12);
    db.exec(`UPDATE artifacts SET public_slug = ? WHERE id = ?`, [slug, artifactId]);
    return slug;
  }

  /** Revoke public access to an artifact. */
  revokeArtifactPublic(artifactId: string, ventureId: string): boolean {
    const db = getDb();
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT id FROM artifacts WHERE id = ? AND venture_id = ?`,
      [artifactId, ventureId]
    );
    if (!row) return false;
    db.exec(`UPDATE artifacts SET public_slug = NULL WHERE id = ?`, [artifactId]);
    return true;
  }

  /** Find an artifact by its public slug (no auth required). */
  findArtifactBySlug(slug: string): Artifact | null {
    const db = getDb();
    const row = db.queryOne<Record<string, unknown>>(
      `SELECT * FROM artifacts WHERE public_slug = ?`,
      [slug]
    );
    if (!row) return null;
    return this.rowToArtifact(row);
  }

  /** Record an engagement interaction for streak tracking. */
  recordEngagement(ventureId: string): void {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const existing = db.queryOne<{ id: string; interactions: number }>(
      `SELECT id, interactions FROM engagement_streaks WHERE venture_id = ? AND date = ?`,
      [ventureId, today]
    );
    if (existing) {
      db.exec(`UPDATE engagement_streaks SET interactions = interactions + 1 WHERE id = ?`, [existing.id]);
    } else {
      db.exec(
        `INSERT INTO engagement_streaks (id, venture_id, date, interactions) VALUES (?, ?, ?, 1)`,
        [randomUUID(), ventureId, today]
      );
    }
  }

  /** Get current engagement streak (consecutive days). */
  getStreak(ventureId: string): { current_days: number; last_active_date: string | null } {
    const db = getDb();
    const rows = db.query<{ date: string }>(
      `SELECT date FROM engagement_streaks WHERE venture_id = ? ORDER BY date DESC LIMIT 90`,
      [ventureId]
    );
    if (rows.length === 0) return { current_days: 0, last_active_date: null };

    const lastDate = rows[0].date;
    const today = new Date().toISOString().split("T")[0];

    // If last activity was more than 1 day ago, streak is broken
    const lastDateObj = new Date(lastDate + "T00:00:00Z");
    const todayObj = new Date(today + "T00:00:00Z");
    const dayDiff = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff > 1) return { current_days: 0, last_active_date: lastDate };

    // Count consecutive days backwards
    let streak = 1;
    for (let i = 1; i < rows.length; i++) {
      const prevDate = new Date(rows[i - 1].date + "T00:00:00Z");
      const currDate = new Date(rows[i].date + "T00:00:00Z");
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return { current_days: streak, last_active_date: lastDate };
  }

  /** Get a dashboard summary for a venture. */
  getDashboard(ventureId: string): {
    venture: Venture;
    phases: ReturnType<VentureService["getPhases"]>;
    artifacts: Artifact[];
    days_active: number;
  } | null {
    const venture = this.findById(ventureId);
    if (!venture) return null;

    const phases = this.getPhases(ventureId);
    const artifacts = this.listArtifacts(ventureId);
    const createdAt = new Date(venture.created_at);
    const now = new Date();
    const daysActive = Math.max(1, Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    return { venture, phases, artifacts, days_active: daysActive };
  }
}
