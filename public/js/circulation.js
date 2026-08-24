const LOAN_KEY = 'library-workspace-loans';
const PATRON_KEY = 'library-workspace-patrons';
const inventory = [
  { barcode: 'BK-0001', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
  { barcode: 'BK-0002', title: 'The City & the City', author: 'China Miéville' },
  { barcode: 'BK-0003', title: 'A Room of One\'s Own', author: 'Virginia Woolf' },
  { barcode: 'BK-0004', title: 'Things Fall Apart', author: 'Chinua Achebe' },
  { barcode: 'BK-0005', title: 'The Dispossessed', author: 'Ursula K. Le Guin' }
];
const form = document.querySelector('#circulation-form');
const rows = document.querySelector('#book-rows');
const message = document.querySelector('#circulation-message');
const availableBooks = document.querySelector('#available-books');
const borrowedBooks = document.querySelector('#borrowed-books');
const normalize = (value) => value.trim().toLowerCase();
const loadLoans = () => JSON.parse(localStorage.getItem(LOAN_KEY) || '[]');
const saveLoans = (loans) => localStorage.setItem(LOAN_KEY, JSON.stringify(loans));
const patronName = (barcode) => { const patron = JSON.parse(localStorage.getItem(PATRON_KEY) || '[]').find((item) => normalize(item.barcode) === normalize(barcode)); return patron ? `${patron.first_name} ${patron.last_name}` : `Patron ${barcode}`; };
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const formatDate = (value) => value ? new Intl.DateTimeFormat([], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

function render() {
  const loans = loadLoans();
  const activeBarcodes = new Set(loans.filter((loan) => !loan.returnedAt).map((loan) => normalize(loan.bookBarcode)));
  availableBooks.textContent = inventory.length - activeBarcodes.size;
  borrowedBooks.textContent = activeBarcodes.size;
  rows.innerHTML = inventory.map((book) => {
    const loan = loans.find((item) => !item.returnedAt && normalize(item.bookBarcode) === normalize(book.barcode));
    return `<tr><td><strong>${escapeHtml(book.barcode)}</strong></td><td>${escapeHtml(book.title)}</td><td>${escapeHtml(book.author)}</td><td><span class="loan-status ${loan ? 'out' : 'in'}">${loan ? 'On loan' : 'Available'}</span></td><td>${loan ? escapeHtml(loan.patronName) : '—'}</td><td>${loan ? formatDate(loan.checkedOutAt) : '—'}</td></tr>`;
  }).join('');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const book = inventory.find((item) => normalize(item.barcode) === normalize(data.bookBarcode));
  const loans = loadLoans();
  const activeLoan = loans.find((loan) => !loan.returnedAt && normalize(loan.bookBarcode) === normalize(data.bookBarcode));
  if (!book) { message.textContent = 'Book barcode was not found in the collection.'; message.classList.add('form-message-error'); message.hidden = false; return; }
  if (data.action === 'checkout' && activeLoan) { message.textContent = 'This book is already checked out.'; message.classList.add('form-message-error'); message.hidden = false; return; }
  if (data.action === 'checkin' && !activeLoan) { message.textContent = 'This book is not currently checked out.'; message.classList.add('form-message-error'); message.hidden = false; return; }
  if (data.action === 'checkout') {
    loans.push({ bookBarcode: book.barcode, patronBarcode: data.patronBarcode, patronName: patronName(data.patronBarcode), checkedOutAt: new Date().toISOString(), returnedAt: null });
    message.textContent = `${book.title} checked out to ${patronName(data.patronBarcode)}.`;
  } else {
    activeLoan.returnedAt = new Date().toISOString();
    message.textContent = `${book.title} checked in successfully.`;
  }
  message.classList.remove('form-message-error');
  message.hidden = false;
  saveLoans(loans);
  form.reset();
  render();
});

window.addEventListener('storage', render);
render();
