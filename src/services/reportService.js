import { pool } from '../db/pool.js';

export async function getServiceUsageReport(startDate, endDate) {
  const start = `${startDate}T00:00:00`;
  const end = `${endDate}T23:59:59.999`;

  const usageQuery = `
    WITH service_usage AS (
      SELECT cl.patron_id, 'Circulation' AS service_name, cl.checked_out_at AS event_time
      FROM circulation_loans cl
      WHERE cl.checked_out_at >= $1::timestamp AND cl.checked_out_at <= $2::timestamp

      UNION ALL

      SELECT s.patron_id, 'Internet Room' AS service_name, s.time_in AS event_time
      FROM internet_sessions s
      WHERE s.time_in >= $1::timestamp AND s.time_in <= $2::timestamp

      UNION ALL

      SELECT p.id AS patron_id, 'Discussion Room' AS service_name, d.created_at AS event_time
      FROM discussion_room_reservations d
      JOIN patrons p ON LOWER(p.barcode) = LOWER(COALESCE(d.request_master_barcode, ''))
      WHERE d.created_at >= $1::timestamp AND d.created_at <= $2::timestamp
        AND d.request_master_barcode IS NOT NULL
    )
    SELECT service_name, COUNT(*) AS usage_count
    FROM service_usage
    GROUP BY service_name
    ORDER BY service_name
  `;

  const uniqueQuery = `
    WITH service_usage AS (
      SELECT cl.patron_id
      FROM circulation_loans cl
      WHERE cl.checked_out_at >= $1::timestamp AND cl.checked_out_at <= $2::timestamp

      UNION ALL

      SELECT s.patron_id
      FROM internet_sessions s
      WHERE s.time_in >= $1::timestamp AND s.time_in <= $2::timestamp

      UNION ALL

      SELECT p.id AS patron_id
      FROM discussion_room_reservations d
      JOIN patrons p ON LOWER(p.barcode) = LOWER(COALESCE(d.request_master_barcode, ''))
      WHERE d.created_at >= $1::timestamp AND d.created_at <= $2::timestamp
        AND d.request_master_barcode IS NOT NULL
    )
    SELECT COUNT(DISTINCT patron_id) AS unique_patrons
    FROM service_usage
  `;

  const [usageResult, uniqueResult] = await Promise.all([
    pool.query(usageQuery, [start, end]),
    pool.query(uniqueQuery, [start, end])
  ]);

  const serviceBreakdown = usageResult.rows.map((row) => ({
    name: row.service_name,
    count: Number(row.usage_count)
  }));

  const totalUsage = serviceBreakdown.reduce((sum, row) => sum + row.count, 0);

  return {
    startDate,
    endDate,
    uniquePatrons: Number(uniqueResult.rows[0]?.unique_patrons || 0),
    totalUsage,
    serviceBreakdown,
    generatedAt: new Date().toISOString()
  };
}
