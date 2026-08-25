const rows = document.querySelector('#patron-rows');
const search = document.querySelector('#patron-search');
const count = document.querySelector('#record-count');

const fields = ['barcode', 'first_name', 'last_name', 'course', 'year', 'patron_type', 'department', 'student_id'];
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

let patrons = [];

async function loadPatrons() {
  try {
    const response = await fetch('/api/patrons');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load patrons');
    patrons = Array.isArray(payload.patrons) ? payload.patrons : [];
    renderRows();
  } catch (error) {
    rows.innerHTML = '<tr class="empty-row"><td colspan="9">Unable to load patron records right now.</td></tr>';
    count.textContent = '0 records';
    console.error(error);
  }
}

function renderRows() {
  const term = search.value.trim().toLowerCase();
  const visible = patrons.filter((patron) => fields.some((field) => String(patron[field] || '').toLowerCase().includes(term)));
  count.textContent = `${visible.length} record${visible.length === 1 ? '' : 's'}`;
  rows.innerHTML = visible.length
    ? visible.map((patron) => `<tr><td>${patron.id}</td>${fields.map((field) => `<td>${escapeHtml(patron[field] ?? '')}</td>`).join('')}</tr>`).join('')
    : '<tr class="empty-row"><td colspan="9">No patron records in this workspace.</td></tr>';
}

search.addEventListener('input', renderRows);
loadPatrons();
