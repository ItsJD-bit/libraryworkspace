import { readFile } from 'node:fs/promises';

import { pool } from './pool.js';

export async function initializeDatabase() {
  const schema = await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8');
  const client = await pool.connect();

  try {
    await client.query(schema);
    console.log('Database schema initialized.');
    return true;
  } catch (error) {
    console.error('Database schema initialization failed:', error.message);
    return false;
  } finally {
    client.release();
  }
}
