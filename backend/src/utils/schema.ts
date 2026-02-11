import { getDb } from "./database";

export function initSchema(dbPath?: string): void {
  const db = getDb(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      experience_level INTEGER,
      business_type TEXT CHECK(business_type IN ('ONLINE','LOCAL','HYBRID')),
      budget INTEGER,
      income_goal INTEGER,
      weekly_hours INTEGER
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS magic_link_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ventures (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT,
      problem_statement TEXT,
      solution_statement TEXT,
      target_customer TEXT,
      offer_description TEXT,
      revenue_model TEXT,
      distribution_channel TEXT,
      estimated_costs TEXT,
      advantage TEXT,
      entity_type TEXT NOT NULL DEFAULT 'NONE' CHECK(entity_type IN ('NONE','SOLE_PROP','LLC','CORP')),
      entity_state TEXT,
      ein_obtained INTEGER NOT NULL DEFAULT 0,
      bank_account_opened INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS phase_progress (
      id TEXT PRIMARY KEY,
      venture_id TEXT NOT NULL REFERENCES ventures(id),
      phase_number INTEGER NOT NULL CHECK(phase_number BETWEEN 1 AND 5),
      status TEXT NOT NULL DEFAULT 'LOCKED' CHECK(status IN ('LOCKED','ACTIVE','COMPLETE')),
      started_at TEXT,
      completed_at TEXT,
      gate_criteria TEXT NOT NULL,
      gate_satisfied INTEGER NOT NULL DEFAULT 0,
      UNIQUE(venture_id, phase_number)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS phase_config (
      phase_number INTEGER PRIMARY KEY CHECK(phase_number BETWEEN 1 AND 5),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      original_sections TEXT NOT NULL,
      core_deliverable TEXT NOT NULL,
      guide_content TEXT NOT NULL,
      tool_recommendations TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      venture_id TEXT NOT NULL REFERENCES ventures(id),
      phase_number INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('BUSINESS_PLAN','OFFER_STATEMENT','BRAND_BRIEF','FINANCIAL_SHEET','CUSTOMER_LIST','GTM_PLAN','GROWTH_PLAN','CUSTOM')),
      content TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      venture_id TEXT NOT NULL REFERENCES ventures(id),
      phase_number INTEGER NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      system_prompt_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // SCALE-4: Separate chat_messages table for efficient access
  // The ai_conversations.messages JSON blob is kept for backward compatibility
  // but new reads use this table when available.
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES ai_conversations(id),
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);
  // Index for fetching messages by conversation with ordering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_convo
    ON chat_messages(conversation_id, timestamp)
  `);

  // UX-5: Artifact version history (append-only)
  db.exec(`
    CREATE TABLE IF NOT EXISTS artifact_versions (
      id TEXT PRIMARY KEY,
      artifact_id TEXT NOT NULL REFERENCES artifacts(id),
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artifact_versions_artifact
    ON artifact_versions(artifact_id, version)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id TEXT PRIMARY KEY,
      venture_id TEXT NOT NULL REFERENCES ventures(id),
      date TEXT NOT NULL,
      messages_used INTEGER NOT NULL DEFAULT 0,
      UNIQUE(venture_id, date)
    )
  `);

  // UX Feature: Shareable artifact links — public_slug column
  // Safe to run repeatedly: ALTER TABLE will fail silently if column exists
  try {
    db.exec(`ALTER TABLE artifacts ADD COLUMN public_slug TEXT`);
  } catch {
    // Column already exists — expected on subsequent runs
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_public_slug ON artifacts(public_slug) WHERE public_slug IS NOT NULL`);

  // UX Feature: Engagement streaks tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS engagement_streaks (
      id TEXT PRIMARY KEY,
      venture_id TEXT NOT NULL REFERENCES ventures(id),
      date TEXT NOT NULL,
      interactions INTEGER NOT NULL DEFAULT 1,
      UNIQUE(venture_id, date)
    )
  `);

  // UX Feature: Anonymous trial chat sessions (3 messages before sign-up)
  db.exec(`
    CREATE TABLE IF NOT EXISTS anonymous_sessions (
      id TEXT PRIMARY KEY,
      session_token TEXT UNIQUE NOT NULL,
      messages_used INTEGER NOT NULL DEFAULT 0,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      claimed_by_user_id TEXT,
      claimed_at TEXT
    )
  `);
}
