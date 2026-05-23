import { Router } from 'express';
import jwt from 'jsonwebtoken';
import type { UserService } from './user.service.js';
import { requireAuth, requireAdmin } from './auth.middleware.js';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

export function createAuthRouter(userService: UserService): Router {
  const router = Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    if (!userService.verifyPassword(username, password)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = userService.getByUsername(username)!;
    const expiry = parseInt(process.env.JWT_EXPIRY || '3600', 10);
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      getSecret(),
      { expiresIn: expiry }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  });

  router.post('/users', requireAuth, requireAdmin, (req, res) => {
    const { username, password, role } = req.body;
    try {
      const user = userService.createUser({ username, password, role: role || 'user' });
      res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  router.get('/users', requireAuth, requireAdmin, (_req, res) => {
    const users = userService.listUsers();
    res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })));
  });

  router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
    if (req.user!.id === req.params.id as string) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }
    const deleted = userService.deleteUser(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(204).send();
  });

  return router;
}
