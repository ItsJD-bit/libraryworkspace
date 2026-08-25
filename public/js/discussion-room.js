const RESERVATION_KEY = 'library-workspace-discussion-reservations';
const TOTAL_ROOMS = 2;
const form = document.querySelector('#session-form');
const reservationForm = document.querySelector('#reservation-form');
const barcodeInput = document.querySelector('#barcode-input');
const lobbyList = document.querySelector('#lobby-list');
const groupSummary = document.querySelector('#group-summary');
const sessionRows = document.querySelector('#session-rows');
const sessionMessage = document.querySelector('#session-message');
const sessionCount = document.querySelector('#session-count');
const dateInput = document.querySelector('#date-input');
const availableCount = document.querySelector('#available-count');
const reservationCount = document.querySelector('#reservation-count');
const inUseCount = document.querySelector('#in-use-count');
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

function renderOverview() {
  const reservations = load(RESERVATION_KEY);
  const active = activeReservations();
  const openRooms = TOTAL_ROOMS - active.length;

  if (availableCount) availableCount.textContent = String(Math.max(openRooms, 0));
  if (reservationCount) reservationCount.textContent = String(reservations.length);
  if (inUseCount) inUseCount.textContent = String(active.length);
}

function openReservationModal(reservationId) {
  const modal = document.querySelector('#reservation-modal');
  const body = document.querySelector('#reservation-modal-body');
  const reservation = load(RESERVATION_KEY).find((item) => item.id === reservationId);
  if (!modal || !body || !reservation) return;

  const master = reservation.members?.[0];
  const membersHtml = reservation.members.map((member, index) => `
    <div class="modal-member-row">
      <span>${index + 1}. ${escapeHtml(member.name)}</span>
      <small>${escapeHtml(member.barcode)}</small>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="modal-grid">
      <div class="modal-field"><span>Request master</span><strong>${escapeHtml(master?.name || 'Unknown')}</strong></div>
      <div class="modal-field"><span>Room</span><strong>${escapeHtml(reservation.room)}</strong></div>
      <div class="modal-field"><span>Date</span><strong>${escapeHtml(reservation.date)}</strong></div>
      <div class="modal-field"><span>Start time</span><strong>${escapeHtml(reservation.startTime)}</strong></div>
      <div class="modal-field"><span>Duration</span><strong>${Number(reservation.duration)} minutes</strong></div>
      <div class="modal-field"><span>Patrons</span><strong>${reservation.members.length}</strong></div>
    </div>
    <div class="modal-members">
      <span class="modal-label">Reservation list</span>
      ${membersHtml}
    </div>
  `;

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeReservationModal() {
  const modal = document.querySelector('#reservation-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function renderSessions() {
  const active = activeReservations();
  sessionCount.textContent = `${active.length} active session${active.length === 1 ? '' : 's'}`;
  sessionRows.innerHTML = active.length
    ? active.map((reservation) => {
      const master = patronForBarcode(reservation.members[0].barcode);
      return `<tr><td><strong>${escapeHtml(reservation.members[0].name)}</strong><small>${reservation.members.length} patrons · ${escapeHtml(reservation.members[0].barcode)}</small></td><td>${escapeHtml(master?.department || 'Unassigned')}</td><td>${escapeHtml(reservation.room)}</td><td>${escapeHtml(reservation.date)}</td><td>${escapeHtml(reservation.startTime)}</td><td class="elapsed" data-start="${reservationTimes(reservation).start.toISOString()}">${elapsed(reservationTimes(reservation).start)}</td><td><button type="button" class="secondary-button small-button view-reservation" data-reservation-id="${reservation.id}">View</button></td></tr>`;
    }).join('')
    : '<tr class="empty-row"><td colspan="7">No rooms are currently in session.</td></tr>';
  renderOverview();
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

sessionRows.addEventListener('click', (event) => {
  const button = event.target.closest('.view-reservation');
  if (!button) return;
  openReservationModal(button.dataset.reservationId);
});

document.addEventListener('click', (event) => {
  const modal = document.querySelector('#reservation-modal');
  if (!modal) return;
  const closeTarget = event.target.closest('[data-close-modal="true"]');
  if (closeTarget || event.target === modal) {
    closeReservationModal();
  }
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
  renderOverview();
});

dateInput.min = toDateValue(today);
dateInput.value = toDateValue(today);
window.setInterval(renderSessions, 1000);
loadPatrons();
renderLobby();
renderSessions();
renderOverview();
