const STORAGE_KEY = 'libspace-attendance-monitoring';
const ATTENDANCE_EVENT_NAME = 'libspace-attendance-updated';
const form = document.querySelector('#attendance-form');
const barcodeInput = document.querySelector('#attendance-barcode');
const attendanceMessage = document.querySelector('#attendance-message');
const attendanceRows = document.querySelector('#attendance-rows');
const attendanceCount = document.querySelector('#attendance-count');
const todayTotal = document.querySelector('#today-total');
const uniqueToday = document.querySelector('#unique-today');
const lastEntry = document.querySelector('#last-entry');
let patrons = [];

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const todayKey = () => new Date().toISOString().slice(0, 10);

function readEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function writeEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(ATTENDANCE_EVENT_NAME, { detail: { entries } }));
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function displayName(patron) {
  if (!patron) return 'Unregistered patron';
  return `${patron.first_name || ''} ${patron.last_name || ''}`.trim() || patron.barcode || 'Unregistered patron';
}

function showMessage(text, error = false) {
  if (!attendanceMessage) return;
  attendanceMessage.textContent = text;
  attendanceMessage.classList.toggle('form-message-error', error);
  attendanceMessage.hidden = false;
}

async function loadPatrons() {
  try {
    const response = await fetch('/api/patrons');
    const payload = await response.json();
    patrons = Array.isArray(payload.patrons) ? payload.patrons : [];
  } catch (error) {
    console.error('Unable to load patrons for attendance monitoring:', error);
    patrons = [];
  }
}

function patronByBarcode(barcode) {
  return patrons.find((patron) => normalize(patron.barcode) === normalize(barcode));
}

function getTodaysEntries() {
  const today = todayKey();
  return readEntries().filter((entry) => entry.checkedInAt && entry.checkedInAt.slice(0, 10) === today);
}

function renderSummary() {
  const todayEntries = getTodaysEntries();
  const uniquePatrons = new Set(todayEntries.map((entry) => entry.barcode)).size;
  const latest = todayEntries.reduce((latestEntry, entry) => {
    if (!latestEntry || new Date(entry.checkedInAt) > new Date(latestEntry.checkedInAt)) {
      return entry;
    }
    return latestEntry;
  }, null);

  if (todayTotal) todayTotal.textContent = String(todayEntries.length);
  if (uniqueToday) uniqueToday.textContent = String(uniquePatrons);
  if (lastEntry) lastEntry.textContent = latest ? formatTime(latest.checkedInAt) : '--:--';
  if (attendanceCount) attendanceCount.textContent = `${todayEntries.length} total check-in${todayEntries.length === 1 ? '' : 's'}`;
}

function renderRows() {
  const todayEntries = getTodaysEntries().sort(
    (a, b) => new Date(b.checkedInAt) - new Date(a.checkedInAt)
  );

  if (!todayEntries.length) {
    attendanceRows.innerHTML =
      '<tr class="empty-row"><td colspan="6">No patrons have checked in yet today.</td></tr>';
    return;
  }

  attendanceRows.innerHTML = todayEntries.map((entry) => {
    const patron = patronByBarcode(entry.barcode);

    return `
      <tr>
        <td><strong>${entry.name || displayName(patron)}</strong></td>
        <td>${entry.department || patron?.department || 'Not assigned'}</td>
        <td>${entry.barcode}</td>
        <td>${entry.service || 'Not selected'}</td>
        <td>${formatTime(entry.checkedInAt)}</td>
        <td><span class="detail-pill">${entry.status || 'Checked in'}</span></td>
      </tr>
    `;
  }).join('');
}

function logArrival(barcode) {
  const cleanBarcode = String(barcode || '').trim();
  if (!cleanBarcode) {
    return { success: false, message: 'Scan or type a patron barcode first.', error: true };
  }

  const patron = patronByBarcode(cleanBarcode);
  if (!patron) {
    return {
      success: false,
      message: 'Patron not found. Please register the patron first or scan a valid barcode.',
      error: true
    };
  }

  const entry = {
    id: crypto.randomUUID(),
    barcode: cleanBarcode,
    name: displayName(patron),
    department: patron.department || 'Not assigned',
    checkedInAt: new Date().toISOString()
  };

  const nextEntries = [entry, ...readEntries()];
  writeEntries(nextEntries);
  renderSummary();
  renderRows();

  return { success: true, message: `${entry.name} checked in successfully.` };
}

function refreshAttendanceState() {
  renderSummary();
  renderRows();
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = logArrival(barcodeInput.value);
    if (result.success) {
      showMessage(result.message, false);
      form.reset();
      barcodeInput.focus();
      return;
    }
    showMessage(result.message, true);
    barcodeInput.focus();
  });
}

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    refreshAttendanceState();
  }
});

window.addEventListener(ATTENDANCE_EVENT_NAME, () => {
  refreshAttendanceState();
});

window.libspaceAttendanceMonitor = {
  logArrival,
  getEntries: () => readEntries(),
  getTodayEntries: () => getTodaysEntries()
};

async function initialize() {
  await loadPatrons();
  refreshAttendanceState();
  if (barcodeInput) {
    barcodeInput.focus();
  }
}

window.addEventListener('load', () => {
  initialize();
});
