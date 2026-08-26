import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';

import { pool } from './pool.js';

export async function initializeDatabase() {
  const schema = await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8');
  const client = await pool.connect();

  try {
    await client.query(schema);
    if (process.env.ADMIN_NAME && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await client.query(
        `INSERT INTO accounts (name, username, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (username) DO NOTHING`,
        [process.env.ADMIN_NAME, process.env.ADMIN_USERNAME, passwordHash]
      );
    }
    console.log('Database schema initialized.');
    return true;
  } catch (error) {
    console.error('Database schema initialization failed:', error.message);
    return false;
  } finally {
    client.release();
  }
}
