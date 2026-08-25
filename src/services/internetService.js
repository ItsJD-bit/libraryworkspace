import { pool } from '../db/pool.js';

const MONTHLY_USAGE_LIMIT_MINUTES = 600;
const FINE_PER_MINUTE = 0.5;

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toDisplaySession(row) {
  return {
    id: row.id,
    patron_id: row.patron_id,
    barcode: row.barcode,
    name: `${row.first_name} ${row.last_name}`,
    first_name: row.first_name,
    last_name: row.last_name,
    department: row.department || 'Unassigned',
    pc: row.pc_number,
    startedAt: row.time_in ? new Date(row.time_in).toISOString() : null,
    time_in: row.time_in ? new Date(row.time_in).toISOString() : null,
    time_out: row.time_out ? new Date(row.time_out).toISOString() : null,
    usage_minutes: Number(row.usage_minutes || 0),
    monthly_usage_minutes: Number(row.monthly_usage_minutes || 0),
    fine_amount: Number(row.fine_amount || 0),
    status: row.status
  };
}

export async function getInternetSessions() {
  const result = await pool.query(`
    SELECT
      s.id,
      s.patron_id,
      s.pc_number,
      s.time_in,
      s.time_out,
      s.usage_minutes,
      s.monthly_usage_minutes,
      s.fine_amount,
      s.status,
      p.barcode,
      p.first_name,
      p.last_name,
      p.department
    FROM internet_sessions s
    INNER JOIN patrons p ON p.id = s.patron_id
    WHERE s.status = 'active'
    ORDER BY s.time_in ASC
  `);

  return result.rows.map(toDisplaySession);
}

export async function startInternetSession({ barcode, pcNumber }) {
  const trimBarcode = String(barcode || '').trim();
  const pc = Number(pcNumber);

  if (!trimBarcode) {
    throw createServiceError('Patron barcode is required.', 400);
  }

  if (!Number.isInteger(pc) || pc < 1) {
    throw createServiceError('A valid PC number is required.', 400);
  }

  const patronResult = await pool.query(
    'SELECT id, barcode, first_name, last_name, department FROM patrons WHERE LOWER(barcode) = LOWER($1) LIMIT 1',
    [trimBarcode]
  );

  if (patronResult.rowCount === 0) {
    throw createServiceError('Patron not found. Please register the patron first or scan a valid barcode.', 404);
  }

  const patron = patronResult.rows[0];

  const activePcResult = await pool.query(
    'SELECT id FROM internet_sessions WHERE pc_number = $1 AND status = $2 LIMIT 1',
    [pc, 'active']
  );

  if (activePcResult.rowCount > 0) {
    throw new Error('This PC is already in use.');
  }

  const activePatronResult = await pool.query(
    'SELECT id FROM internet_sessions WHERE patron_id = $1 AND status = $2 LIMIT 1',
    [patron.id, 'active']
  );

  if (activePatronResult.rowCount > 0) {
    throw new Error('This patron already has an active internet session.');
  }

  const sessionResult = await pool.query(
    `
      INSERT INTO internet_sessions (patron_id, pc_number, time_in, status)
      VALUES ($1, $2, NOW(), 'active')
      RETURNING id, patron_id, pc_number, time_in, time_out, usage_minutes, fine_amount, monthly_usage_minutes, status
    `,
    [patron.id, pc]
  );

  return toDisplaySession({
    ...sessionResult.rows[0],
    barcode: patron.barcode,
    first_name: patron.first_name,
    last_name: patron.last_name,
    department: patron.department || 'Unassigned'
  });
}

export async function endInternetSession({ barcode }) {
  const trimBarcode = String(barcode || '').trim();

  if (!trimBarcode) {
    throw createServiceError('Patron barcode is required.', 400);
  }

  const activeSessionResult = await pool.query(
    `
      SELECT s.id, s.patron_id, s.pc_number, s.time_in, p.barcode, p.first_name, p.last_name, p.department
      FROM internet_sessions s
      INNER JOIN patrons p ON p.id = s.patron_id
      WHERE LOWER(p.barcode) = LOWER($1) AND s.status = 'active'
      ORDER BY s.time_in DESC
      LIMIT 1
    `,
    [trimBarcode]
  );

  if (activeSessionResult.rowCount === 0) {
    throw createServiceError('Patron not found or no active session is currently open for this barcode.', 404);
  }

  const session = activeSessionResult.rows[0];
  const now = new Date();
  const timeIn = new Date(session.time_in);
  const usageMinutes = Math.max(1, Math.round((now.getTime() - timeIn.getTime()) / 60000));

  const monthlyUsageResult = await pool.query(
    `
      SELECT COALESCE(SUM(usage_minutes), 0) AS total_minutes
      FROM internet_sessions
      WHERE patron_id = $1
        AND status = 'ended'
        AND time_in >= date_trunc('month', CURRENT_DATE)
    `,
    [session.patron_id]
  );

  const previousUsageMinutes = Number(monthlyUsageResult.rows[0]?.total_minutes || 0);
  const totalUsageThisMonth = previousUsageMinutes + usageMinutes;
  const fineAmount = totalUsageThisMonth > MONTHLY_USAGE_LIMIT_MINUTES
    ? (totalUsageThisMonth - MONTHLY_USAGE_LIMIT_MINUTES) * FINE_PER_MINUTE
    : 0;

  const updatedResult = await pool.query(
    `
      UPDATE internet_sessions
      SET time_out = $1,
          usage_minutes = $2,
          monthly_usage_minutes = $3,
          fine_amount = $4,
          status = 'ended'
      WHERE id = $5
      RETURNING id, patron_id, pc_number, time_in, time_out, usage_minutes, monthly_usage_minutes, fine_amount, status
    `,
    [now, usageMinutes, totalUsageThisMonth, fineAmount, session.id]
  );

  const updatedSession = updatedResult.rows[0];

  return toDisplaySession({
    ...updatedSession,
    barcode: session.barcode,
    first_name: session.first_name,
    last_name: session.last_name,
    department: session.department || 'Unassigned'
  });
}

export async function getMonthlyUsageSummaryForPatron(patronId) {
  const result = await pool.query(
    `
      SELECT COALESCE(SUM(usage_minutes), 0) AS total_usage_minutes,
             COALESCE(SUM(fine_amount), 0) AS total_fines
      FROM internet_sessions
      WHERE patron_id = $1
        AND time_in >= date_trunc('month', CURRENT_DATE)
    `,
    [patronId]
  );

  return {
    total_usage_minutes: Number(result.rows[0]?.total_usage_minutes || 0),
    total_fines: Number(result.rows[0]?.total_fines || 0)
  };
}
