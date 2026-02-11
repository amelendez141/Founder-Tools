import { randomUUID, randomBytes, createHash } from "crypto";
import { getDb } from "../utils/database";
import type { User, MagicLinkToken } from "../types";

export class UserService {
  /** Create a new user. Throws if email already exists (UNIQUE constraint). */
  createUser(email: string): User {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    db.exec(
      `INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)`,
      [id, email, now]
    );

    return {
      id,
      email,
      created_at: now,
      experience_level: null,
      business_type: null,
      budget: null,
      income_goal: null,
      weekly_hours: null,
    };
  }

  /** Find user by email. Returns null if not found. */
  findByEmail(email: string): User | null {
    const db = getDb();
    return db.queryOne<User>(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );
  }

  /** Find user by ID. Returns null if not found. */
  findById(id: string): User | null {
    const db = getDb();
    return db.queryOne<User>(
      `SELECT * FROM users WHERE id = ?`,
      [id]
    );
  }

  /** Update intake fields for a user. */
  updateIntake(
    userId: string,
    data: {
      experience_level: number;
      business_type: string;
      budget: number;
      income_goal: number;
      weekly_hours: number;
    }
  ): User | null {
    const db = getDb();
    db.exec(
      `UPDATE users SET experience_level = ?, business_type = ?, budget = ?, income_goal = ?, weekly_hours = ? WHERE id = ?`,
      [
        data.experience_level,
        data.business_type,
        data.budget,
        data.income_goal,
        data.weekly_hours,
        userId,
      ]
    );
    return this.findById(userId);
  }

  /** Generate a magic link token for a user. Token expires in 15 minutes. */
  createMagicLinkToken(userId: string): MagicLinkToken {
    const db = getDb();
    const id = randomUUID();
    const rawToken = randomBytes(32).toString("hex");
    const token = createHash("sha256").update(rawToken).digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min

    db.exec(
      `INSERT INTO magic_link_tokens (id, user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
      [id, userId, token, expiresAt.toISOString(), now.toISOString()]
    );

    // Return the RAW token (not hashed) — this is what goes in the email link
    return {
      id,
      user_id: userId,
      token: rawToken,
      expires_at: expiresAt.toISOString(),
      used: false,
      created_at: now.toISOString(),
    };
  }

  /** Verify a magic link token. Returns user if valid, null if invalid/expired. */
  verifyToken(rawToken: string): User | null {
    const db = getDb();
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    const tokenRow = db.queryOne<{
      id: string;
      user_id: string;
      token: string;
      expires_at: string;
      used: number;
    }>(
      `SELECT * FROM magic_link_tokens WHERE token = ? AND used = 0`,
      [hashedToken]
    );

    if (!tokenRow) return null;

    // Check expiration
    if (new Date(tokenRow.expires_at) < new Date()) {
      return null;
    }

    // Mark token as used
    db.exec(
      `UPDATE magic_link_tokens SET used = 1 WHERE id = ?`,
      [tokenRow.id]
    );

    return this.findById(tokenRow.user_id);
  }
}
