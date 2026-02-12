import { randomUUID, randomBytes, createHash, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "../utils/database";
import type { User, MagicLinkToken } from "../types";

// Password hashing using scrypt (built-in Node.js, no external dependency needed)
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return timingSafeEqual(hashBuffer, derivedKey);
}

export class UserService {
  /** Create a new user with password. Throws if email already exists (UNIQUE constraint). */
  createUserWithPassword(email: string, password: string): User {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    db.exec(
      `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
      [id, email, passwordHash, now]
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

  /** Verify email and password. Returns user if valid, null otherwise. */
  verifyPassword(email: string, password: string): User | null {
    const db = getDb();
    const row = db.queryOne<{ id: string; password_hash: string | null }>(
      `SELECT id, password_hash FROM users WHERE email = ?`,
      [email]
    );

    if (!row || !row.password_hash) return null;
    if (!verifyPassword(password, row.password_hash)) return null;

    return this.findById(row.id);
  }

  /** Create a new user (legacy - for magic link flow). Throws if email already exists (UNIQUE constraint). */
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
