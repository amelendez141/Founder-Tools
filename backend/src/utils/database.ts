import { DatabaseSync } from "node:sqlite";
import * as path from "path";
import * as fs from "fs";

const DB_PATH = path.join(__dirname, "..", "..", "data", "toolkit.db");

/**
 * SQLite database wrapper using Node.js built-in node:sqlite module.
 *
 * Fixes applied:
 * - SCALE-1: Eliminates Python subprocess spawning per query
 * - SCALE-3: Enables WAL mode for concurrent reads + busy_timeout
 * - SEC-5 (partial): No more temp files with sensitive data on disk
 */
export class Database {
  private db: DatabaseSync;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? DB_PATH;
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(resolvedPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.db.exec("PRAGMA foreign_keys = ON");
  }

  // SQLInputValue = string | number | bigint | null | Uint8Array
  // We cast unknown[] since our actual values are always string | number | null
  private castParams(params: unknown[]): Array<string | number | bigint | null | Uint8Array> {
    return params as Array<string | number | bigint | null | Uint8Array>;
  }

  exec(sql: string, params: unknown[] = []): void {
    const stmt = this.db.prepare(sql);
    stmt.run(...this.castParams(params));
  }

  query<T>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...this.castParams(params));
    // node:sqlite returns null-prototype objects — convert to plain objects
    return rows.map((row) => ({ ...(row as Record<string, unknown>) })) as T[];
  }

  queryOne<T>(sql: string, params: unknown[] = []): T | null {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...this.castParams(params)) as Record<string, unknown> | undefined;
    if (!row) return null;
    return { ...row } as T;
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let _db: Database | null = null;

export function getDb(dbPath?: string): Database {
  if (!_db) {
    _db = new Database(dbPath);
  }
  return _db;
}

/** Reset singleton (for tests) */
export function resetDb(): void {
  if (_db) {
    try { _db.close(); } catch { /* ignore */ }
  }
  _db = null;
}
