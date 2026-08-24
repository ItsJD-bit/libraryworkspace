const form = document.querySelector('#session-form');
const barcodeInput = document.querySelector('#barcode-input');
const pcSelect = document.querySelector('#pc-select');
const pcGrid = document.querySelector('#pc-grid');
const sessionRows = document.querySelector('#session-rows');
const sessionMessage = document.querySelector('#session-message');
const sessionButtonLabel = document.querySelector('#session-button-label');
const availableCount = document.querySelector('#available-count');
const inUseCount = document.querySelector('#in-use-count');
const sessionCount = document.querySelector('#session-count');
const sessions = [];
const pcs = Array.from({ length: 20 }, (_, index) => index + 1);
const patronStorageKey = 'library-workspace-patrons';

const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const normalize = (value) => value.trim().toLowerCase();
const patronForBarcode = (barcode) => JSON.parse(localStorage.getItem(patronStorageKey) || '[]').find((patron) => normalize(patron.barcode) === normalize(barcode));
const elapsed = (startedAt) => {
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}h ` : ''}${Math.floor((seconds % 3600) / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
};
const timeIn = (startedAt) => new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(startedAt);
const activeSessionForBarcode = (barcode) => sessions.find((session) => normalize(session.barcode) === normalize(barcode));

function renderPcOptions() {
  const usedPcs = new Set(sessions.map((session) => session.pc));
  const available = pcs.filter((pc) => !usedPcs.has(pc));
  pcSelect.innerHTML = available.length ? available.map((pc) => `<option value="${pc}">PC ${String(pc).padStart(2, '0')}</option>`).join('') : '<option value="">No PCs available</option>';
  pcSelect.disabled = !available.length;
  form.querySelector('button').disabled = !available.length;
}

function renderPcGrid() {
  const usedPcs = new Set(sessions.map((session) => session.pc));
  pcGrid.innerHTML = pcs.map((pc) => `<div class="pc-unit ${usedPcs.has(pc) ? 'occupied' : 'available'}"><span class="pc-number">${String(pc).padStart(2, '0')}</span><span>${usedPcs.has(pc) ? 'In use' : 'Available'}</span></div>`).join('');
  availableCount.textContent = pcs.length - usedPcs.size;
  inUseCount.textContent = usedPcs.size;
}

function renderSessions() {
  sessionCount.textContent = `${sessions.length} active session${sessions.length === 1 ? '' : 's'}`;
  sessionRows.innerHTML = sessions.length ? sessions.map((session) => `<tr><td><strong>${escapeHtml(session.name)}</strong><small>${escapeHtml(session.barcode)}</small></td><td>${escapeHtml(session.department)}</td><td>PC ${String(session.pc).padStart(2, '0')}</td><td>${timeIn(session.startedAt)}</td><td class="elapsed" data-started-at="${session.startedAt}">${elapsed(session.startedAt)}</td></tr>`).join('') : '<tr class="empty-row"><td colspan="5">No patrons are currently using the internet room.</td></tr>';
}

function render() { renderPcOptions(); renderPcGrid(); renderSessions(); }

barcodeInput.addEventListener('input', () => {
  const activeSession = activeSessionForBarcode(barcodeInput.value.trim());
  sessionButtonLabel.textContent = activeSession ? 'End session' : 'Start session';
  sessionMessage.hidden = true;
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const barcode = barcodeInput.value.trim();
  const activeSession = activeSessionForBarcode(barcode);
  if (activeSession) {
    sessions.splice(sessions.indexOf(activeSession), 1);
    sessionMessage.textContent = `Session ended for ${activeSession.name} on PC ${String(activeSession.pc).padStart(2, '0')}.`;
  } else {
    const pc = Number(pcSelect.value);
    const patron = patronForBarcode(barcode);
    sessions.push({ barcode, name: patron ? `${patron.first_name} ${patron.last_name}` : `Patron ${barcode}`, department: patron?.department || 'Unassigned', pc, startedAt: Date.now() });
    sessionMessage.textContent = `Session started on PC ${String(pc).padStart(2, '0')}. Scan ${barcode} again to end it.`;
  }
  sessionMessage.hidden = false;
  form.reset();
  sessionButtonLabel.textContent = 'Start session';
  render();
  barcodeInput.focus();
});

window.setInterval(() => document.querySelectorAll('.elapsed').forEach((cell) => { cell.textContent = elapsed(Number(cell.dataset.startedAt)); }), 1000);
render();
