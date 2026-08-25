const form = document.querySelector('#book-form');
const bookRows = document.querySelector('#book-rows');
const messageBox = document.querySelector('#book-message');
const searchInput = document.querySelector('#book-search');
const detailPanel = document.querySelector('#book-detail-panel');
const detailContent = document.querySelector('#book-detail-content');

let books = [];

const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const normalize = (value) => String(value ?? '').trim().toLowerCase();
const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

function showMessage(text, isError = false) {
  messageBox.textContent = text;
  messageBox.hidden = false;
  messageBox.classList.toggle('form-message-error', isError);
}

function renderBookDetail(book) {
  if (!book) {
    detailPanel.hidden = true;
    detailContent.innerHTML = '';
    return;
  }

  const lcsh = Array.isArray(book.lcsh) ? book.lcsh : [];
  const lcshHtml = lcsh.length
    ? lcsh.map((heading) => `<span class="detail-pill">${escapeHtml(heading.heading || heading || 'Subject')}</span>`).join('')
    : '<span class="detail-plain">No subject headings recorded.</span>';

  detailPanel.hidden = false;
  detailContent.innerHTML = `
    <div class="book-detail-grid">
      <div class="detail-card detail-card-main">
        <span class="detail-label">Title</span>
        <h3>${escapeHtml(book.title || 'Untitled')}</h3>
        <p>${escapeHtml(book.subtitle || 'No subtitle provided')}</p>
      </div>
      <div class="detail-card">
        <span class="detail-label">Author</span>
        <strong>${escapeHtml(book.author || '—')}</strong>
      </div>
      <div class="detail-card">
        <span class="detail-label">Barcode</span>
        <strong>${escapeHtml(book.barcode || '—')}</strong>
      </div>
      <div class="detail-card">
        <span class="detail-label">Collection</span>
        <strong>${escapeHtml((book.collection_type || 'circulation').replace(/^./, (char) => char.toUpperCase()))}</strong>
      </div>
      <div class="detail-card">
        <span class="detail-label">DDC / Cutter</span>
        <strong>${escapeHtml(`${book.ddc_number || book.ddc || '—'} / ${book.cutter_number || book.cutter || '—'}`)}</strong>
      </div>
      <div class="detail-card">
        <span class="detail-label">Edition / Publisher</span>
        <strong>${escapeHtml(`${book.edition || '—'} / ${book.publisher || '—'}`)}</strong>
      </div>
      <div class="detail-card">
        <span class="detail-label">ISBN / ISBN-13</span>
        <strong>${escapeHtml(`${book.isbn || '—'} / ${book.isbn_13 || '—'}`)}</strong>
      </div>
      <div class="detail-card detail-card-wide">
        <span class="detail-label">Description</span>
        <p>${escapeHtml(book.description || 'No description available.')}</p>
      </div>
      <div class="detail-card detail-card-wide">
        <span class="detail-label">Subject headings</span>
        <div class="detail-pills">${lcshHtml}</div>
      </div>
      <div class="detail-card">
        <span class="detail-label">Location</span>
        <strong>${escapeHtml(book.location || '—')}</strong>
      </div>
      <div class="detail-card">
        <span class="detail-label">Condition</span>
        <strong>${escapeHtml(book.condition || '—')}</strong>
      </div>
      <div class="detail-card">
        <span class="detail-label">Status</span>
        <strong>${escapeHtml(book.archived ? 'Archived' : (book.status || 'Available'))}</strong>
      </div>
      <div class="detail-card">
        <span class="detail-label">Price</span>
        <strong>${escapeHtml(formatValue(book.price ?? 0))}</strong>
      </div>
    </div>
  `;
}

async function loadBooks() {
  try {
    const response = await fetch('/api/books');
    const payload = await response.json();
    books = Array.isArray(payload.books) ? payload.books : [];
    renderBooks();
  } catch (error) {
    console.error('Failed to load books:', error);
    showMessage('Unable to load books from the database.', true);
  }
}

function renderBooks() {
  const query = normalize(searchInput.value);
  const filtered = !query
    ? books
    : books.filter((book) => [book.title, book.author, book.barcode, book.isbn, book.isbn_13].some((value) => normalize(value).includes(query)));

  if (!filtered.length) {
    bookRows.innerHTML = '<tr class="empty-row"><td colspan="7">No books match the current filter.</td></tr>';
    return;
  }

  bookRows.innerHTML = filtered.map((book) => `
    <tr>
      <td><strong>${escapeHtml(book.title)}</strong>${book.subtitle ? `<small>${escapeHtml(book.subtitle)}</small>` : ''}</td>
      <td>${escapeHtml(book.author)}</td>
      <td>${escapeHtml(book.barcode || '—')}</td>
      <td>${escapeHtml(book.ddc || book.ddc_number || '—')}</td>
      <td><span class="loan-status ${book.archived ? 'out' : 'in'}">${book.archived ? 'Archived' : (book.status || 'Available')}</span></td>
      <td><span class="collection-tag">${escapeHtml((book.collection_type || 'circulation').replace(/^./, (char) => char.toUpperCase()))}</span></td>
      <td><button class="secondary-button small-button" type="button" data-action="view" data-id="${book.id}">View</button></td>
      <td><button class="secondary-button small-button" type="button" data-action="archive" data-id="${book.id}">${book.archived ? 'Restore' : 'Archive'}</button></td>
      <td><button class="secondary-button small-button danger-button" type="button" data-action="delete" data-id="${book.id}">Delete</button></td>
    </tr>
  `).join('');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(form).entries());
  const payload = {
    ...formData,
    publication_year: formData.publication_year ? Number(formData.publication_year) : null,
    pages: formData.pages ? Number(formData.pages) : null,
    price: formData.price ? Number(formData.price) : 0,
    collection_type: formData.collection_type || 'circulation',
    archived: false
  };

  try {
    const response = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Unable to add the book.');
    }

    form.reset();
    showMessage(`Book added: ${result.book.title}`);
    await loadBooks();
    renderBookDetail(result.book);
  } catch (error) {
    showMessage(error.message, true);
  }
});

bookRows.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  try {
    if (action === 'view') {
      const book = books.find((item) => Number(item.id) === id);
      renderBookDetail(book || null);
      return;
    }

    if (action === 'archive') {
      const response = await fetch(`/api/books/${id}/archive`, { method: 'PATCH' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update archive status.');
      showMessage(`${result.book.title} ${result.book.archived ? 'archived' : 'restored'}.`);
    }

    if (action === 'delete') {
      const response = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete the book.');
      showMessage('Book deleted successfully.');
      renderBookDetail(null);
    }

    await loadBooks();
  } catch (error) {
    showMessage(error.message, true);
  }
});

searchInput.addEventListener('input', renderBooks);
renderBookDetail(null);
loadBooks();
