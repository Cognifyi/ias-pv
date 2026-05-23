import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { initDb } from '../src/auth/db.js';

describe('initDb', () => {
  it('creates the users table', () => {
    const db = new Database(':memory:');
    initDb(db);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).all();
    expect(tables.length).toBe(1);
  });

  it('creates the username index', () => {
    const db = new Database(':memory:');
    initDb(db);

    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_username'"
    ).all();
    expect(indexes.length).toBe(1);
  });

  it('does not fail on re-init', () => {
    const db = new Database(':memory:');
    initDb(db);
    expect(() => initDb(db)).not.toThrow();
  });

  it('creates table with correct schema', () => {
    const db = new Database(':memory:');
    initDb(db);

    const columns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string; type: string; notnull: number }>;
    const colNames = columns.map(c => c.name);
    expect(colNames).toContain('id');
    expect(colNames).toContain('username');
    expect(colNames).toContain('password_hash');
    expect(colNames).toContain('role');
    expect(colNames).toContain('created_at');
    expect(colNames).toContain('updated_at');
  });

  it('enforces unique username constraint', () => {
    const db = new Database(':memory:');
    initDb(db);

    db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES ('1', 'dup', 'hash', 'user')").run();
    expect(() => {
      db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES ('2', 'dup', 'hash', 'user')").run();
    }).toThrow();
  });
});
