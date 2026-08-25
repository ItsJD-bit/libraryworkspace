import { pool } from '../db/pool.js';

const MAX_CIRCULATION_DAYS = 3;
const FINE_PER_DAY = 5;
const FILIPINIANA_DAYS = 2;
const REFERENCE_LOANABLE = false;

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getLoanRuleForBook(collectionType) {
  const normalized = String(collectionType || 'circulation').toLowerCase();

  if (normalized === 'reference') {
    return { maxDays: 0, finePerDay: 0, renewalsAllowed: 0, loanable: false, label: 'Reference' };
  }

  if (normalized === 'filipiniana') {
    return { maxDays: FILIPINIANA_DAYS, finePerDay: FINE_PER_DAY, renewalsAllowed: 1, loanable: true, label: 'Filipiniana' };
  }

  return { maxDays: MAX_CIRCULATION_DAYS, finePerDay: FINE_PER_DAY, renewalsAllowed: 1, loanable: true, label: 'Circulation' };
}

function getDueDateFromCheckout(checkedOutAt, collectionType) {
  const rule = getLoanRuleForBook(collectionType);
  if (!rule.loanable) {
    return null;
  }
  const date = new Date(checkedOutAt);
  date.setDate(date.getDate() + rule.maxDays);
  return date;
}

function toLoanDisplay(row) {
  return {
    id: row.id,
    book_id: row.book_id,
    title: row.title,
    author: row.author,
    barcode: row.barcode,
    collection_type: row.collection_type || 'circulation',
    patron_id: row.patron_id,
    patron_barcode: row.patron_barcode,
    patron_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown patron',
    checked_out_at: row.checked_out_at ? new Date(row.checked_out_at).toISOString() : null,
    due_date: row.due_date ? new Date(row.due_date).toISOString() : null,
    returned_at: row.returned_at ? new Date(row.returned_at).toISOString() : null,
    status: row.status || 'checked_out',
    renewals_used: Number(row.renewals_used || 0),
    fine_amount: Number(row.fine_amount || 0),
    loan_rule: getLoanRuleForBook(row.collection_type)
  };
}

export async function getCirculationSummary() {
  const booksResult = await pool.query(`
    SELECT COUNT(*) FILTER (WHERE archived = false)::int AS total_books,
           COUNT(*) FILTER (WHERE archived = false AND status = 'available')::int AS available_books
    FROM books
  `);

  const activeLoansResult = await pool.query(`
    SELECT COUNT(*)::int AS active_loans
    FROM circulation_loans
    WHERE status = 'checked_out' AND returned_at IS NULL
  `);

  return {
    total_books: Number(booksResult.rows[0]?.total_books || 0),
    available_books: Number(booksResult.rows[0]?.available_books || 0),
    active_loans: Number(activeLoansResult.rows[0]?.active_loans || 0)
  };
}

export async function getLoanedBooks() {
  const result = await pool.query(`
    SELECT b.id, b.title, b.author, b.barcode, b.collection_type, b.status,
           l.id AS loan_id, l.patron_id, l.checked_out_at, l.due_date, l.returned_at,
           l.fine_amount, l.renewals_used,
           p.barcode AS patron_barcode, p.first_name, p.last_name
    FROM books b
    LEFT JOIN circulation_loans l
      ON l.book_id = b.id AND l.status = 'checked_out' AND l.returned_at IS NULL
    LEFT JOIN patrons p ON p.id = l.patron_id
    ORDER BY b.title ASC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    barcode: row.barcode,
    collection_type: row.collection_type || 'circulation',
    status: row.status || 'available',
    is_on_loan: Boolean(row.loan_id),
    checked_out_at: row.checked_out_at ? new Date(row.checked_out_at).toISOString() : null,
    due_date: row.due_date ? new Date(row.due_date).toISOString() : null,
    current_patron: row.patron_barcode ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : '—',
    fine_amount: Number(row.fine_amount || 0),
    renewals_used: Number(row.renewals_used || 0)
  }));
}

export async function getActiveLoans() {
  const result = await pool.query(`
    SELECT l.id, l.book_id, b.title, b.author, b.barcode, b.collection_type,
           l.patron_id, p.barcode AS patron_barcode, p.first_name, p.last_name,
           l.checked_out_at, l.due_date, l.returned_at, l.status,
           l.renewals_used, l.fine_amount
    FROM circulation_loans l
    INNER JOIN books b ON b.id = l.book_id
    INNER JOIN patrons p ON p.id = l.patron_id
    WHERE l.status = 'checked_out' AND l.returned_at IS NULL
    ORDER BY l.checked_out_at DESC
  `);

  return result.rows.map(toLoanDisplay);
}

export async function checkoutBook(data = {}) {
  const bookBarcode = String(data.book_barcode || data.bookBarcode || '').trim();
  const patronBarcode = String(data.patron_barcode || data.patronBarcode || '').trim();

  if (!bookBarcode) {
    throw createServiceError('Book barcode is required.', 400);
  }

  if (!patronBarcode) {
    throw createServiceError('Patron barcode is required.', 400);
  }

  const bookResult = await pool.query(
    `
      SELECT id, title, author, barcode, collection_type, status, archived
      FROM books
      WHERE LOWER(barcode) = LOWER($1)
      LIMIT 1
    `,
    [bookBarcode]
  );

  if (bookResult.rowCount === 0) {
    throw createServiceError('Book barcode was not found in the collection.', 404);
  }

  const book = bookResult.rows[0];
  const rule = getLoanRuleForBook(book.collection_type);

  if (!rule.loanable) {
    throw createServiceError('This is a reference book and cannot be loaned outside the library.', 400);
  }

  if (book.archived) {
    throw createServiceError('This book is archived and cannot be checked out.', 400);
  }

  const patronResult = await pool.query(
    `
      SELECT id, barcode, first_name, last_name
      FROM patrons
      WHERE LOWER(barcode) = LOWER($1)
      LIMIT 1
    `,
    [patronBarcode]
  );

  if (patronResult.rowCount === 0) {
    throw createServiceError('Patron not found. Please register the patron first or scan a valid barcode.', 404);
  }

  const patron = patronResult.rows[0];

  const activeLoanResult = await pool.query(
    `
      SELECT id
      FROM circulation_loans
      WHERE book_id = $1 AND status = 'checked_out' AND returned_at IS NULL
      LIMIT 1
    `,
    [book.id]
  );

  if (activeLoanResult.rowCount > 0) {
    throw createServiceError('This book is already checked out.', 409);
  }

  const checkedOutAt = new Date();
  const dueDate = getDueDateFromCheckout(checkedOutAt, book.collection_type);

  const loanResult = await pool.query(
    `
      INSERT INTO circulation_loans (book_id, patron_id, checked_out_at, due_date, status, renewals_used, fine_amount)
      VALUES ($1, $2, $3, $4, 'checked_out', 0, 0.00)
      RETURNING id, book_id, patron_id, checked_out_at, due_date, status, renewals_used, fine_amount
    `,
    [book.id, patron.id, checkedOutAt, dueDate]
  );

  const loan = loanResult.rows[0];

  await pool.query(
    `
      UPDATE books
      SET status = 'checked_out'
      WHERE id = $1
    `,
    [book.id]
  );

  return {
    message: `${book.title} checked out to ${patron.first_name} ${patron.last_name}.`,
    loan: toLoanDisplay({
      ...loan,
      title: book.title,
      author: book.author,
      barcode: book.barcode,
      collection_type: book.collection_type,
      patron_barcode: patron.barcode,
      first_name: patron.first_name,
      last_name: patron.last_name,
      returned_at: null
    })
  };
}

export async function checkinBook(data = {}) {
  const bookBarcode = String(data.book_barcode || data.bookBarcode || '').trim();

  if (!bookBarcode) {
    throw createServiceError('Book barcode is required.', 400);
  }

  const activeLoanResult = await pool.query(
    `
      SELECT l.id, l.book_id, l.patron_id, l.checked_out_at, l.due_date, l.status,
             p.barcode AS patron_barcode, p.first_name, p.last_name,
             b.title, b.author, b.barcode, b.collection_type
      FROM circulation_loans l
      INNER JOIN books b ON b.id = l.book_id
      INNER JOIN patrons p ON p.id = l.patron_id
      WHERE LOWER(b.barcode) = LOWER($1) AND l.status = 'checked_out' AND l.returned_at IS NULL
      LIMIT 1
    `,
    [bookBarcode]
  );

  if (activeLoanResult.rowCount === 0) {
    throw createServiceError('This book is not currently checked out.', 404);
  }

  const loan = activeLoanResult.rows[0];
  const now = new Date();
  const dueDate = loan.due_date ? new Date(loan.due_date) : null;
  const daysLate = dueDate && now > dueDate ? Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / 86400000)) : 0;
  const lateFine = daysLate > 0 ? daysLate * getLoanRuleForBook(loan.collection_type).finePerDay : 0;

  const updatedResult = await pool.query(
    `
      UPDATE circulation_loans
      SET returned_at = $1,
          status = 'returned',
          fine_amount = $2
      WHERE id = $3
      RETURNING id, book_id, patron_id, checked_out_at, due_date, returned_at, status, fine_amount, renewals_used
    `,
    [now, Number(lateFine.toFixed(2)), loan.id]
  );

  await pool.query(
    `
      UPDATE books
      SET status = 'available'
      WHERE id = $1
    `,
    [loan.book_id]
  );

  return {
    message: daysLate > 0
      ? `${loan.title} checked in. Late fine: ₱${lateFine.toFixed(2)}.`
      : `${loan.title} checked in successfully.`,
    fine_amount: Number(lateFine.toFixed(2)),
    loan: toLoanDisplay({
      ...updatedResult.rows[0],
      title: loan.title,
      author: loan.author,
      barcode: loan.barcode,
      collection_type: loan.collection_type,
      patron_barcode: loan.patron_barcode,
      first_name: loan.first_name,
      last_name: loan.last_name,
      returned_at: now.toISOString()
    })
  };
}

export async function renewLoan(data = {}) {
  const loanId = Number(data.loan_id || data.id || 0);

  if (!loanId) {
    throw createServiceError('Loan id is required.', 400);
  }

  const loanResult = await pool.query(
    `
      SELECT l.id, l.book_id, l.patron_id, l.checked_out_at, l.due_date, l.renewals_used,
             b.title, b.barcode, b.collection_type,
             p.first_name, p.last_name
      FROM circulation_loans l
      INNER JOIN books b ON b.id = l.book_id
      INNER JOIN patrons p ON p.id = l.patron_id
      WHERE l.id = $1 AND l.status = 'checked_out' AND l.returned_at IS NULL
      LIMIT 1
    `,
    [loanId]
  );

  if (loanResult.rowCount === 0) {
    throw createServiceError('Active loan not found.', 404);
  }

  const loan = loanResult.rows[0];
  const rule = getLoanRuleForBook(loan.collection_type);

  if (!rule.loanable) {
    throw createServiceError('Reference books cannot be renewed.', 400);
  }

  if (loan.renewals_used >= rule.renewalsAllowed) {
    throw createServiceError(`This loan has already used the maximum renewal allowance (${rule.renewalsAllowed}).`, 400);
  }

  const renewedDueDate = new Date(loan.due_date || loan.checked_out_at);
  renewedDueDate.setDate(renewedDueDate.getDate() + rule.maxDays);

  const updatedResult = await pool.query(
    `
      UPDATE circulation_loans
      SET due_date = $1,
          renewals_used = renewals_used + 1
      WHERE id = $2
      RETURNING id, book_id, patron_id, checked_out_at, due_date, renewals_used, status
    `,
    [renewedDueDate, loan.id]
  );

  return {
    message: `${loan.title} renewed successfully. New due date: ${renewedDueDate.toISOString().slice(0, 10)}.`,
    loan: toLoanDisplay({
      ...updatedResult.rows[0],
      title: loan.title,
      author: '',
      barcode: loan.barcode,
      collection_type: loan.collection_type,
      paton_barcode: '',
      first_name: loan.first_name,
      last_name: loan.last_name,
      returned_at: null
    })
  };
}
