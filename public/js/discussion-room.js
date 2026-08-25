const RESERVATION_KEY = 'library-workspace-discussion-reservations';
const form = document.querySelector('#session-form');
const reservationForm = document.querySelector('#reservation-form');
const barcodeInput = document.querySelector('#barcode-input');
const lobbyList = document.querySelector('#lobby-list');
const groupSummary = document.querySelector('#group-summary');
const sessionRows = document.querySelector('#session-rows');
const sessionMessage = document.querySelector('#session-message');
const sessionCount = document.querySelector('#session-count');
const dateInput = document.querySelector('#date-input');
let group = [];
let patrons = [];

const load = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const normalize = (value) => String(value ?? '').trim().toLowerCase();
const today = new Date();
const toDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const displayName = (patron) => patron ? `${patron.first_name} ${patron.last_name}` : 'Unregistered patron';
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

async function loadPatrons() {
  try {
    const response = await fetch('/api/patrons');
    const payload = await response.json();
    patrons = Array.isArray(payload.patrons) ? payload.patrons : [];
    return patrons;
  } catch (error) {
    console.error('Unable to load patrons for discussion room:', error);
    patrons = [];
    return [];
  }
}

function patronForBarcode(barcode) {
  return patrons.find((patron) => normalize(patron.barcode) === normalize(barcode));
}

function showMessage(text, error = false) {
  sessionMessage.textContent = text;
  sessionMessage.classList.toggle('form-message-error', error);
  sessionMessage.hidden = false;
}

function renderLobby() {
  groupSummary.textContent = group.length ? `${group.length} of 8 patrons scanned${group.length < 3 ? ' · need at least 3' : ' · ready to reserve'}` : 'No patrons scanned yet.';
  lobbyList.innerHTML = group.length
    ? group.map((member, index) => `<div class="lobby-member"><span class="lobby-number">${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.barcode)}${index === 0 ? ' · Request master' : ' · Member'}</small></span><button type="button" class="remove-member" data-barcode="${escapeHtml(member.barcode)}" aria-label="Remove ${escapeHtml(member.name)}">×</button></div>`).join('')
    : '<span class="lobby-empty">Scanned patrons appear in the lobby list.</span>';
}

function reservationTimes(reservation) {
  const start = new Date(`${reservation.date}T${reservation.startTime}`);
  return { start, end: new Date(start.getTime() + Number(reservation.duration) * 60000) };
}

function overlaps(first, second) {
  const a = reservationTimes(first);
  const b = reservationTimes(second);
  return first.room === second.room && a.start < b.end && b.start < a.end;
}

function activeReservations() {
  const now = new Date();
  return load(RESERVATION_KEY).filter((reservation) => {
    const times = reservationTimes(reservation);
    return times.start <= now && now < times.end;
  });
}

function renderSessions() {
  const active = activeReservations();
  sessionCount.textContent = `${active.length} active session${active.length === 1 ? '' : 's'}`;
  sessionRows.innerHTML = active.length
    ? active.map((reservation) => {
      const master = patronForBarcode(reservation.members[0].barcode);
      return `<tr><td><strong>${escapeHtml(reservation.members[0].name)}</strong><small>${reservation.members.length} patrons · ${escapeHtml(reservation.members[0].barcode)}</small></td><td>${escapeHtml(master?.department || 'Unassigned')}</td><td>${escapeHtml(reservation.room)}</td><td>${escapeHtml(reservation.date)}</td><td>${escapeHtml(reservation.startTime)}</td><td class="elapsed" data-start="${reservationTimes(reservation).start.toISOString()}">${elapsed(reservationTimes(reservation).start)}</td></tr>`;
    }).join('')
    : '<tr class="empty-row"><td colspan="6">No rooms are currently in session.</td></tr>';
}

function elapsed(start) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 1000));
  return `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}h ` : ''}${Math.floor((seconds % 3600) / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const barcode = barcodeInput.value.trim();
  if (!barcode) return showMessage('Scan or type a patron barcode first.', true);
  if (group.some((member) => normalize(member.barcode) === normalize(barcode))) return showMessage('That barcode is already in this group.', true);
  if (group.length >= 8) return showMessage('A discussion room can hold a maximum of 8 patrons.', true);

  const patron = patronForBarcode(barcode);
  if (!patron) {
    showMessage('Patron not found. Please register the patron first or scan a valid barcode.', true);
    barcodeInput.focus();
    return;
  }

  group.push({ barcode, name: displayName(patron) });
  barcodeInput.value = '';
  showMessage(group.length === 1 ? `${group[0].name} is the request master.` : 'Patron added to the lobby group.');
  renderLobby();
  barcodeInput.focus();
});

lobbyList.addEventListener('click', (event) => {
  const button = event.target.closest('.remove-member');
  if (!button) return;
  group = group.filter((member) => normalize(member.barcode) !== normalize(button.dataset.barcode));
  renderLobby();
});

reservationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (group.length < 3) return showMessage('At least 3 patrons are required to reserve a room.', true);
  if (group.length > 8) return showMessage('A discussion room can hold a maximum of 8 patrons.', true);
  const data = Object.fromEntries(new FormData(reservationForm).entries());
  const reservation = { id: crypto.randomUUID(), ...data, duration: Number(data.duration), members: group, createdAt: Date.now() };
  if (load(RESERVATION_KEY).some((existing) => overlaps(existing, reservation))) return showMessage(`${data.room} is already reserved during that time. Choose another room or time.`, true);
  save(RESERVATION_KEY, [...load(RESERVATION_KEY), reservation]);
  showMessage(`${data.room} reserved for ${group.length} patrons. The room becomes occupied when the session starts.`);
  group = [];
  reservationForm.reset();
  dateInput.value = toDateValue(today);
  renderLobby();
  renderSessions();
});

dateInput.min = toDateValue(today);
dateInput.value = toDateValue(today);
window.setInterval(renderSessions, 1000);
loadPatrons();
renderLobby();
renderSessions();
