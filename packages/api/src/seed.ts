import Database from 'better-sqlite3';
import { UserService } from './auth/user.service.js';
import { initDb } from './auth/db.js';

const dbPath = process.env.SQLITE_PATH || './data/auth.db';
const db = new Database(dbPath);
initDb(db);

const userService = new UserService(db);
userService.init();

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'admin';

try {
  const user = userService.createUser({ username, password, role: 'admin' });
  console.log(`Admin user created: ${user.username} (id: ${user.id})`);
} catch (e) {
  if ((e as Error).message === 'Username already exists') {
    console.log(`Admin user "${username}" already exists`);
  } else {
    throw e;
  }
} finally {
  db.close();
}
