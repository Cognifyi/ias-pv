import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { UserService } from '../src/auth/user.service.js';
import type { User, CreateUserInput } from '../src/auth/user.service.js';

describe('UserService', () => {
  let db: Database.Database;
  let service: UserService;

  beforeAll(() => {
    db = new Database(':memory:');
    service = new UserService(db);
    service.init();
  });

  afterAll(() => {
    db.close();
  });

  const validInput: CreateUserInput = {
    username: 'testuser',
    password: 'password123',
    role: 'user',
  };

  it('creates a user and returns it without password_hash', () => {
    const user = service.createUser(validInput);

    expect(user.id).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.role).toBe('user');
    expect(user.createdAt).toBeDefined();
    expect((user as Record<string, unknown>).password_hash).toBeUndefined();
  });

  it('creates a user with admin role', () => {
    const user = service.createUser({ username: 'admin', password: 'admin123', role: 'admin' });
    expect(user.role).toBe('admin');
  });

  it('hashes the password with bcrypt', () => {
    const row = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('testuser') as { password_hash: string };
    expect(row.password_hash).not.toBe('password123');
    expect(row.password_hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('throws on duplicate username', () => {
    expect(() => service.createUser(validInput)).toThrow('Username already exists');
  });

  it('verifies correct password', () => {
    const result = service.verifyPassword('testuser', 'password123');
    expect(result).toBe(true);
  });

  it('rejects incorrect password', () => {
    const result = service.verifyPassword('testuser', 'wrongpassword');
    expect(result).toBe(false);
  });

  it('returns false for non-existent user', () => {
    const result = service.verifyPassword('nobody', 'password');
    expect(result).toBe(false);
  });

  it('gets user by username', () => {
    const user = service.getByUsername('testuser');
    expect(user).toBeDefined();
    expect(user!.username).toBe('testuser');
  });

  it('returns undefined for non-existent username', () => {
    expect(service.getByUsername('nobody')).toBeUndefined();
  });

  it('gets user by id', () => {
    const created = service.createUser({ username: 'byid', password: 'pass', role: 'user' });
    const found = service.getById(created.id);
    expect(found).toBeDefined();
    expect(found!.username).toBe('byid');
  });

  it('lists all users', () => {
    const users = service.listUsers();
    expect(users.length).toBeGreaterThanOrEqual(3);
  });

  it('deletes a user', () => {
    const created = service.createUser({ username: 'todelete', password: 'pass', role: 'user' });
    const deleted = service.deleteUser(created.id);
    expect(deleted).toBe(true);
    expect(service.getById(created.id)).toBeUndefined();
  });

  it('returns false when deleting non-existent user', () => {
    expect(service.deleteUser('non-existent')).toBe(false);
  });

  it('validates empty username', () => {
    expect(() => service.createUser({ username: '', password: 'pass', role: 'user' })).toThrow('Username is required');
  });

  it('validates short password', () => {
    expect(() => service.createUser({ username: 'shortpw', password: '12', role: 'user' })).toThrow('Password must be at least 4 characters');
  });

  it('validates role value', () => {
    expect(() => service.createUser({ username: 'badrole', password: 'pass', role: 'superadmin' as 'admin' })).toThrow('Invalid role');
  });
});
