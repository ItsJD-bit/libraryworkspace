const form = document.querySelector('#patron-form');
const rows = document.querySelector('#patron-rows');
const search = document.querySelector('#patron-search');
const message = document.querySelector('#patron-message');
const count = document.querySelector('#record-count');
const STORAGE_KEY = 'library-workspace-patrons';
let patrons = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

const fields = ['barcode', 'first_name', 'last_name', 'course', 'year', 'patron_type', 'department', 'student_id'];
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function renderRows() {
  const term = search.value.trim().toLowerCase();
  const visible = patrons.filter((patron) => fields.some((field) => String(patron[field] || '').toLowerCase().includes(term)));
  count.textContent = `${visible.length} record${visible.length === 1 ? '' : 's'}`;
  rows.innerHTML = visible.length
    ? visible.map((patron) => `<tr><td>${patron.id}</td>${fields.map((field) => `<td>${escapeHtml(patron[field])}</td>`).join('')}</tr>`).join('')
    : '<tr class="empty-row"><td colspan="9">No patron records in this workspace.</td></tr>';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  if (patrons.some((patron) => patron.barcode.toLowerCase() === data.barcode.trim().toLowerCase())) {
    message.textContent = 'This barcode is already registered.';
    message.hidden = false;
    return;
  }
  patrons.push({ id: patrons.length + 1, ...data });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patrons));
  form.reset();
  message.textContent = 'Patron added to this temporary workspace.';
  message.hidden = false;
  renderRows();
});

window.addEventListener('storage', () => {
  patrons = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  renderRows();
});

search.addEventListener('input', renderRows);
