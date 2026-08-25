import { pool } from '../db/pool.js';

export async function getPatrons() {
  const result = await pool.query(`
    SELECT id, barcode, first_name, last_name, course, year, patron_type, department, student_id
    FROM patrons
    ORDER BY id ASC
  `);

  return result.rows;
}

export async function createPatron(data) {
  const { barcode, first_name, last_name, course, year, patron_type, department, student_id } = data;

  const result = await pool.query(
    `
      INSERT INTO patrons (barcode, first_name, last_name, course, year, patron_type, department, student_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, barcode, first_name, last_name, course, year, patron_type, department, student_id
    `,
    [barcode, first_name, last_name, course, year || null, patron_type, department || null, student_id || null]
  );

  return result.rows[0];
}

export async function checkPatronBarcodeExists(barcode) {
  const result = await pool.query(
    'SELECT 1 FROM patrons WHERE LOWER(barcode) = LOWER($1) LIMIT 1',
    [barcode]
  );

  return result.rowCount > 0;
}
