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
const pcs = Array.from({ length: 20 }, (_, index) => index + 1);

const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const normalize = (value) => String(value ?? '').trim().toLowerCase();
const formatElapsed = (startedAt) => {
  const start = new Date(startedAt).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours ? `${hours}h ` : ''}${minutes}m ${String(secs).padStart(2, '0')}s`;
};
const formatTime = (value) => new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

let sessions = [];

async function fetchSessions() {
  try {
    const response = await fetch('/api/internet/sessions');
    const payload = await response.json();
    sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    render();
  } catch (error) {
    console.error('Failed to load internet sessions:', error);
    sessionMessage.textContent = 'Unable to load active internet sessions.';
    sessionMessage.hidden = false;
  }
}

function renderPcOptions() {
  const usedPcs = new Set(sessions.map((session) => Number(session.pc)));
  const available = pcs.filter((pc) => !usedPcs.has(pc));
  pcSelect.innerHTML = available.length ? available.map((pc) => `<option value="${pc}">PC ${String(pc).padStart(2, '0')}</option>`).join('') : '<option value="">No PCs available</option>';
  pcSelect.disabled = !available.length;
  form.querySelector('button').disabled = !available.length;
}

function renderPcGrid() {
  const usedPcs = new Set(sessions.map((session) => Number(session.pc)));
  pcGrid.innerHTML = pcs.map((pc) => `<div class="pc-unit ${usedPcs.has(pc) ? 'occupied' : 'available'}"><span class="pc-number">${String(pc).padStart(2, '0')}</span><span>${usedPcs.has(pc) ? 'In use' : 'Available'}</span></div>`).join('');
  availableCount.textContent = String(pcs.length - usedPcs.size);
  inUseCount.textContent = String(usedPcs.size);
}

function renderSessions() {
  sessionCount.textContent = `${sessions.length} active session${sessions.length === 1 ? '' : 's'}`;
  sessionRows.innerHTML = sessions.length
    ? sessions.map((session) => `<tr><td><strong>${escapeHtml(session.name)}</strong><small>${escapeHtml(session.barcode)}</small></td><td>${escapeHtml(session.department)}</td><td>PC ${String(session.pc).padStart(2, '0')}</td><td>${formatTime(session.time_in)}</td><td class="elapsed" data-started-at="${session.time_in}">${formatElapsed(session.time_in)}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">No patrons are currently using the internet room.</td></tr>';
}

function render() {
  renderPcOptions();
  renderPcGrid();
  renderSessions();
}

barcodeInput.addEventListener('input', () => {
  const value = barcodeInput.value.trim();
  const existing = sessions.some((session) => normalize(session.barcode) === normalize(value));
  sessionButtonLabel.textContent = existing ? 'End session' : 'Start session';
  sessionMessage.hidden = true;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const barcode = barcodeInput.value.trim();
  const existing = sessions.some((session) => normalize(session.barcode) === normalize(barcode));

  try {
    const endpoint = existing ? '/api/internet/sessions/end' : '/api/internet/sessions/start';
    const payload = existing ? { barcode } : { barcode, pc_number: Number(pcSelect.value) };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Unable to update internet room session.');
    }

    const session = result.session;
    const pcLabel = `PC ${String(session.pc).padStart(2, '0')}`;
    sessionMessage.classList.remove('form-message-error');
    if (existing) {
      const fineAmount = Number(session.fine_amount || 0);
      sessionMessage.textContent = fineAmount > 0
        ? `Session ended for ${session.name} on ${pcLabel}. Fine: ₱${fineAmount.toFixed(2)}.`
        : `Session ended for ${session.name} on ${pcLabel}.`;
    } else {
      sessionMessage.textContent = `Session started for ${session.name} on ${pcLabel}.`;
    }
    sessionMessage.hidden = false;
    form.reset();
    sessionButtonLabel.textContent = 'Start session';
    await fetchSessions();
  } catch (error) {
    sessionMessage.classList.add('form-message-error');
    sessionMessage.textContent = error.message;
    sessionMessage.hidden = false;
  }

  barcodeInput.focus();
});

window.setInterval(() => {
  document.querySelectorAll('.elapsed').forEach((cell) => {
    const startedAt = cell.dataset.startedAt;
    if (startedAt) {
      cell.textContent = formatElapsed(startedAt);
    }
  });
}, 1000);

fetchSessions();
