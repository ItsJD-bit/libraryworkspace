import { pool } from './pool.js';

export async function initializeDatabase() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection successful.');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}
