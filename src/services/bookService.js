import { pool } from '../db/pool.js';

export async function getBooks() {
  const result = await pool.query(`
    SELECT *
    FROM books
    ORDER BY id ASC
  `);

  return result.rows;
}

export async function getBookById(id) {
  const result = await pool.query(
    'SELECT * FROM books WHERE id = $1 LIMIT 1',
    [id]
  );

  return result.rows[0] || null;
}

function normalizeJsonb(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return value;
}

export async function createBook(data) {
  const normalized = {
    title: String(data.title || '').trim(),
    subtitle: String(data.subtitle ?? '').trim(),
    author: String(data.author || '').trim(),
    illustrator: String(data.illustrator ?? '').trim(),
    edition: String(data.edition ?? '').trim(),
    publisher: String(data.publisher ?? '').trim(),
    publication_year: data.publication_year ?? null,
    language: String(data.language ?? '').trim(),
    isbn: String(data.isbn ?? '').trim(),
    isbn_13: String(data.isbn_13 ?? '').trim(),
    ddc_number: String(data.ddc_number ?? data.ddc ?? '').trim(),
    cutter_number: String(data.cutter_number ?? data.cutter ?? '').trim(),
    lcsh: normalizeJsonb(data.lcsh),
    ddc: String(data.ddc ?? '').trim(),
    cutter: String(data.cutter ?? '').trim(),
    genre: String(data.genre ?? '').trim(),
    format: String(data.format ?? '').trim(),
    pages: data.pages ?? null,
    description: String(data.description ?? '').trim(),
    subject: String(data.subject ?? '').trim(),
    barcode: String(data.barcode ?? '').trim(),
    collection_type: String(data.collection_type ?? 'circulation').trim() || 'circulation',
    status: String(data.status ?? 'available').trim() || 'available',
    location: String(data.location ?? '').trim(),
    condition: String(data.condition ?? '').trim(),
    price: Number(data.price ?? 0),
    notes: String(data.notes ?? '').trim(),
    acquisition_date: data.acquisition_date || new Date().toISOString(),
    archived: Boolean(data.archived)
  };

  const values = [
    normalized.title,
    normalized.subtitle,
    normalized.author,
    normalized.illustrator,
    normalized.edition,
    normalized.publisher,
    normalized.publication_year,
    normalized.language,
    normalized.isbn,
    normalized.isbn_13,
    normalized.ddc_number,
    normalized.cutter_number,
    normalized.lcsh === null ? null : JSON.stringify(normalized.lcsh),
    normalized.ddc,
    normalized.cutter,
    normalized.genre,
    normalized.format,
    normalized.pages,
    normalized.description,
    normalized.subject,
    normalized.barcode,
    normalized.collection_type,
    normalized.status,
    normalized.location,
    normalized.condition,
    normalized.price,
    normalized.notes,
    normalized.acquisition_date,
    normalized.archived
  ];

  const result = await pool.query(
    `
      INSERT INTO books (
        title,
        subtitle,
        author,
        illustrator,
        edition,
        publisher,
        publication_year,
        language,
        isbn,
        isbn_13,
        ddc_number,
        cutter_number,
        lcsh,
        ddc,
        cutter,
        genre,
        format,
        pages,
        description,
        subject,
        barcode,
        collection_type,
        status,
        location,
        condition,
        price,
        notes,
        acquisition_date,
        archived
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
      RETURNING *
    `,
    values
  );

  return result.rows[0];
}

export async function updateBook(id, data) {
  const current = await getBookById(id);
  if (!current) {
    throw new Error('Book not found.');
  }

  const next = {
    ...current,
    ...data,
    title: data.title || current.title,
    author: data.author || current.author,
    subtitle: data.subtitle ?? current.subtitle,
    illustrator: data.illustrator ?? current.illustrator,
    edition: data.edition ?? current.edition,
    publisher: data.publisher ?? current.publisher,
    publication_year: data.publication_year ?? current.publication_year,
    language: data.language ?? current.language,
    isbn: data.isbn ?? current.isbn,
    isbn_13: data.isbn_13 ?? current.isbn_13,
    ddc_number: data.ddc_number ?? current.ddc_number,
    cutter_number: data.cutter_number ?? current.cutter_number,
    lcsh: normalizeJsonb(data.lcsh ?? current.lcsh),
    ddc: data.ddc ?? current.ddc,
    cutter: data.cutter ?? current.cutter,
    genre: data.genre ?? current.genre,
    format: data.format ?? current.format,
    pages: data.pages ?? current.pages,
    description: data.description ?? current.description,
    subject: data.subject ?? current.subject,
    barcode: data.barcode ?? current.barcode,
    collection_type: data.collection_type ?? current.collection_type ?? 'circulation',
    status: data.status ?? current.status,
    location: data.location ?? current.location,
    condition: data.condition ?? current.condition,
    price: data.price ?? current.price,
    notes: data.notes ?? current.notes,
    acquisition_date: data.acquisition_date ?? current.acquisition_date,
    archived: data.archived ?? current.archived
  };

  const result = await pool.query(
    `
      UPDATE books
      SET title = $2,
          subtitle = $3,
          author = $4,
          illustrator = $5,
          edition = $6,
          publisher = $7,
          publication_year = $8,
          language = $9,
          isbn = $10,
          isbn_13 = $11,
          ddc_number = $12,
          cutter_number = $13,
          lcsh = $14,
          ddc = $15,
          cutter = $16,
          genre = $17,
          format = $18,
          pages = $19,
          description = $20,
          subject = $21,
          barcode = $22,
          collection_type = $23,
          status = $24,
          location = $25,
          condition = $26,
          price = $27,
          notes = $28,
          acquisition_date = $29,
          archived = $30
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      next.title,
      next.subtitle,
      next.author,
      next.illustrator,
      next.edition,
      next.publisher,
      next.publication_year,
      next.language,
      next.isbn,
      next.isbn_13,
      next.ddc_number,
      next.cutter_number,
      next.lcsh === null ? null : JSON.stringify(next.lcsh),
      next.ddc,
      next.cutter,
      next.genre,
      next.format,
      next.pages,
      next.description,
      next.subject,
      next.barcode,
      next.collection_type,
      next.status,
      next.location,
      next.condition,
      next.price,
      next.notes,
      next.acquisition_date,
      next.archived
    ]
  );

  return result.rows[0];
}

export async function archiveBook(id) {
  const updated = await updateBook(id, { archived: true, status: 'archived' });
  return updated;
}

export async function deleteBook(id) {
  const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

export async function checkBarcodeExists(barcode) {
  const result = await pool.query(
    'SELECT 1 FROM books WHERE LOWER(barcode) = LOWER($1) LIMIT 1',
    [String(barcode || '').trim()]
  );

  return result.rowCount > 0;
}
