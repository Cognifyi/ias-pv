import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { UserService } from '../src/auth/user.service.js';
import { initDb } from '../src/auth/db.js';

describe('Seed flow', () => {
  it('creates admin user with defaults', () => {
    const db = new Database(':memory:');
    initDb(db);
    const userService = new UserService(db);
    userService.init();

    const user = userService.createUser({ username: 'admin', password: 'admin', role: 'admin' });
    expect(user.username).toBe('admin');
    expect(user.role).toBe('admin');
    db.close();
  });

  it('does not fail if admin already exists', () => {
    const db = new Database(':memory:');
    initDb(db);
    const userService = new UserService(db);
    userService.init();

    userService.createUser({ username: 'admin', password: 'admin', role: 'admin' });
    expect(() => {
      userService.createUser({ username: 'admin', password: 'admin', role: 'admin' });
    }).toThrow('Username already exists');
    db.close();
  });

  it('creates custom username and password', () => {
    const db = new Database(':memory:');
    initDb(db);
    const userService = new UserService(db);
    userService.init();

    const user = userService.createUser({ username: 'superadmin', password: 's3cret!', role: 'admin' });
    expect(user.username).toBe('superadmin');
    expect(userService.verifyPassword('superadmin', 's3cret!')).toBe(true);
    db.close();
  });
});
