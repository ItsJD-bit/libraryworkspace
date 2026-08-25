const form = document.querySelector('#circulation-form');
const patronField = form.querySelector('input[name="patronBarcode"]');
const rows = document.querySelector('#book-rows');
const message = document.querySelector('#circulation-message');
const availableBooks = document.querySelector('#available-books');
const borrowedBooks = document.querySelector('#borrowed-books');
const totalBooks = document.querySelector('#total-books');

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const formatDate = (value) => value ? new Intl.DateTimeFormat([], { dateStyle: 'medium' }).format(new Date(value)) : '—';
const formatMoney = (value) => `₱${Number(value || 0).toFixed(2)}`;

let books = [];
let summary = { total_books: 0, available_books: 0, active_loans: 0 };

function updatePatronFieldState() {
  const isCheckout = form.elements.action.value === 'checkout';
  patronField.disabled = !isCheckout;
  patronField.required = isCheckout;
  patronField.setAttribute('aria-disabled', String(!isCheckout));
  if (!isCheckout) {
    patronField.value = '';
  }
}

async function fetchSummary() {
  try {
    const response = await fetch('/api/circulation/summary');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load circulation summary.');
    summary = payload;
    availableBooks.textContent = String(summary.available_books || 0);
    borrowedBooks.textContent = String(summary.active_loans || 0);
    totalBooks.textContent = String(summary.total_books || 0);
  } catch (error) {
    console.error('Unable to load summary:', error);
  }
}

async function fetchBooks() {
  try {
    const response = await fetch('/api/circulation/books');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load books.');
    books = Array.isArray(payload.books) ? payload.books : [];
    render();
  } catch (error) {
    console.error('Unable to load loaned books:', error);
    rows.innerHTML = '<tr class="empty-row"><td colspan="9">Unable to load circulation records right now.</td></tr>';
  }
}

function render() {
  rows.innerHTML = books.map((book) => {
    const status = book.is_on_loan ? 'On loan' : 'Available';
    const collection = (book.collection_type || 'circulation').replace(/^./, (char) => char.toUpperCase());
    const dueDate = book.due_date ? formatDate(book.due_date) : '—';
    const fine = book.is_on_loan ? formatMoney(book.fine_amount || 0) : '—';
    const action = book.is_on_loan
      ? `<button class="secondary-button small-button" type="button" data-action="renew" data-id="${book.loan_id || book.id}">Renew</button>`
      : '<span class="collection-tag">Loanable</span>';

    return `
      <tr>
        <td><strong>${escapeHtml(book.barcode || '—')}</strong></td>
        <td>${escapeHtml(book.title || '—')}</td>
        <td>${escapeHtml(book.author || '—')}</td>
        <td><span class="collection-tag">${escapeHtml(collection)}</span></td>
        <td><span class="loan-status ${book.is_on_loan ? 'out' : 'in'}">${status}</span></td>
        <td>${escapeHtml(book.current_patron || '—')}</td>
        <td>${escapeHtml(dueDate)}</td>
        <td>${escapeHtml(fine)}</td>
        <td>${action}</td>
      </tr>
    `;
  }).join('') || '<tr class="empty-row"><td colspan="9">No books in circulation.</td></tr>';
}

async function handleAction(action, payload) {
  const endpoint = action === 'checkout'
    ? '/api/circulation/checkout'
    : action === 'checkin'
      ? '/api/circulation/checkin'
      : '/api/circulation/renew';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Unable to process the circulation request.');
  }

  return result;
}

form.addEventListener('change', updatePatronFieldState);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  if (data.action === 'checkin') {
    delete data.patronBarcode;
  }

  try {
    if (data.action === 'checkout') {
      const result = await handleAction('checkout', {
        book_barcode: data.bookBarcode,
        patron_barcode: data.patronBarcode
      });
      message.textContent = result.message || 'Checkout completed.';
    } else {
      const result = await handleAction('checkin', {
        book_barcode: data.bookBarcode
      });
      message.textContent = result.message || 'Check-in completed.';
    }

    message.classList.remove('form-message-error');
    message.hidden = false;
    form.reset();
    await fetchSummary();
    await fetchBooks();
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('form-message-error');
    message.hidden = false;
  }
});

rows.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="renew"]');
  if (!button) return;

  const loanId = Number(button.dataset.id);
  if (!loanId) {
    return;
  }

  try {
    const result = await handleAction('renew', { loan_id: loanId });
    message.textContent = result.message || 'The book was renewed successfully.';
    message.classList.remove('form-message-error');
    message.hidden = false;
    await fetchSummary();
    await fetchBooks();
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('form-message-error');
    message.hidden = false;
  }
});

updatePatronFieldState();
fetchSummary();
fetchBooks();
