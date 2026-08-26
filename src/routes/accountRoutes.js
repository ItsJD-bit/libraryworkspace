import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

router.post('/api/auth/login', async (request, response) => {
  const { username, password } = request.body;
  if (!username || !password) {
    response.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const result = await pool.query(
    'SELECT id, name, username, password_hash, role FROM accounts WHERE username = $1',
    [username.trim()]
  );
  const account = result.rows[0];
  if (!account || !(await bcrypt.compare(password, account.password_hash))) {
    response.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  request.session.account = { id: account.id, name: account.name, username: account.username, role: account.role };
  response.json({ account: request.session.account });
});

router.post('/api/auth/logout', (request, response) => {
  request.session.destroy(() => response.status(204).end());
});

router.get('/api/auth/me', (request, response) => {
  response.json({ account: request.session?.account || null });
});

router.get('/api/accounts', requireAdmin, async (_request, response) => {
  const result = await pool.query('SELECT id, name, username, role, created_at FROM accounts ORDER BY created_at DESC');
  response.json({ accounts: result.rows });
});

router.post('/api/accounts', requireAdmin, async (request, response) => {
  const { name, username, password } = request.body;
  if (!name?.trim() || !username?.trim() || !password || password.length < 8) {
    response.status(400).json({ error: 'Name, username, and a password of at least 8 characters are required.' });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO accounts (name, username, password_hash) VALUES ($1, $2, $3) RETURNING id, name, username, role, created_at',
      [name.trim(), username.trim(), passwordHash]
    );
    response.status(201).json({ account: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      response.status(409).json({ error: 'That username is already in use.' });
      return;
    }
    throw error;
  }
});

router.delete('/api/accounts/:id', requireAdmin, async (request, response) => {
  if (Number(request.params.id) === request.session.account.id) {
    response.status(400).json({ error: 'You cannot delete the account currently in use.' });
    return;
  }
  await pool.query('DELETE FROM accounts WHERE id = $1', [request.params.id]);
  response.status(204).end();
});

export default router;