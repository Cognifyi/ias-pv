import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: 'admin' | 'user';
}

const SALT_ROUNDS = 10;

export class UserService {
  constructor(private db: Database.Database) {}

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  }

  createUser(input: CreateUserInput): User {
    if (!input.username) throw new Error('Username is required');
    if (!input.password || input.password.length < 4) throw new Error('Password must be at least 4 characters');
    if (input.role !== 'admin' && input.role !== 'user') throw new Error('Invalid role');

    const existing = this.db.prepare('SELECT id FROM users WHERE username = ?').get(input.username);
    if (existing) throw new Error('Username already exists');

    const id = randomUUID();
    const passwordHash = bcrypt.hashSync(input.password, SALT_ROUNDS);

    this.db.prepare(
      'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(id, input.username, passwordHash, input.role);

    return this.getById(id)!;
  }

  getByUsername(username: string): User | undefined {
    return this.mapUser(
      this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as Record<string, unknown> | undefined
    );
  }

  getById(id: string): User | undefined {
    return this.mapUser(
      this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined
    );
  }

  listUsers(): User[] {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as Record<string, unknown>[];
    return rows.map(r => this.mapUser(r)!);
  }

  deleteUser(id: string): boolean {
    const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  verifyPassword(username: string, password: string): boolean {
    const row = this.db.prepare('SELECT password_hash FROM users WHERE username = ?').get(username) as { password_hash: string } | undefined;
    if (!row) return false;
    return bcrypt.compareSync(password, row.password_hash);
  }

  private mapUser(row: Record<string, unknown> | undefined): User | undefined {
    if (!row) return undefined;
    return {
      id: row.id as string,
      username: row.username as string,
      role: row.role as 'admin' | 'user',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
