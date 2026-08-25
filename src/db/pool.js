import pg from 'pg';
import { environment } from '../config/environment.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: environment.databaseUrl,
  ssl: environment.databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: false }
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL client error', error);
});

export async function testDatabaseConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

export async function ensureInternetSessionSchema() {
  const client = await pool.connect();
  try {
    await client.query("ALTER TABLE IF EXISTS internet_sessions ADD COLUMN IF NOT EXISTS pc_number INTEGER");
    await client.query("ALTER TABLE IF EXISTS internet_sessions ADD COLUMN IF NOT EXISTS time_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    await client.query("ALTER TABLE IF EXISTS internet_sessions ADD COLUMN IF NOT EXISTS time_out TIMESTAMP");
    await client.query("ALTER TABLE IF EXISTS internet_sessions ADD COLUMN IF NOT EXISTS usage_minutes INTEGER NOT NULL DEFAULT 0");
    await client.query("ALTER TABLE IF EXISTS internet_sessions ADD COLUMN IF NOT EXISTS monthly_usage_minutes INTEGER NOT NULL DEFAULT 0");
    await client.query("ALTER TABLE IF EXISTS internet_sessions ADD COLUMN IF NOT EXISTS fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00");
    await client.query("ALTER TABLE IF EXISTS internet_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active'");
    await client.query("UPDATE internet_sessions SET status = 'active' WHERE status IS NULL");
    return true;
  } finally {
    client.release();
  }
}

export async function ensureBookCirculationSchema() {
  const client = await pool.connect();
  try {
    await client.query("ALTER TABLE IF EXISTS books ADD COLUMN IF NOT EXISTS collection_type VARCHAR(30) NOT NULL DEFAULT 'circulation'");
    await client.query("ALTER TABLE IF EXISTS circulation_loans ADD COLUMN IF NOT EXISTS fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00");
    await client.query("ALTER TABLE IF EXISTS circulation_loans ADD COLUMN IF NOT EXISTS renewals_used INTEGER NOT NULL DEFAULT 0");
    await client.query("ALTER TABLE IF EXISTS circulation_loans ADD COLUMN IF NOT EXISTS loan_note TEXT");
    await client.query("UPDATE books SET collection_type = 'circulation' WHERE collection_type IS NULL OR collection_type = ''");
    return true;
  } finally {
    client.release();
  }
}
