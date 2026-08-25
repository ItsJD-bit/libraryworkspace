const form = document.querySelector('#patron-scan-form');
const input = document.querySelector('#patron-scan-input');
const focusName = document.querySelector('#focus-name');
const focusDepartment = document.querySelector('#focus-department');
const focusBarcode = document.querySelector('#focus-barcode');
const scanMessage = document.querySelector('#scan-message');
const ATTENDANCE_STORAGE_KEY = 'libspace-attendance-monitoring';
const ATTENDANCE_EVENT_NAME = 'libspace-attendance-updated';
let patrons = [];
let resetTimer = null;

const normalize = (value) => String(value ?? '').trim().toLowerCase();

function readAttendanceEntries() {
  try {
      return JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '[]');
  } catch (error) {
      return [];
  }
}

function writeAttendanceEntries(entries) {
  localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(ATTENDANCE_EVENT_NAME, { detail: { entries } }));
}

function recordAttendanceEntry(patron) {
  const entry = {
      id: crypto.randomUUID(),
      barcode: patron.barcode || '',
      name: `${patron.first_name || ''} ${patron.last_name || ''}`.trim() || 'Unknown patron',
      department: patron.department || 'Not assigned',
      checkedInAt: new Date().toISOString()
  };

  const nextEntries = [entry, ...readAttendanceEntries()];
  writeAttendanceEntries(nextEntries);
}

function showMessage(text, isError = false) {
  if (!scanMessage) return;
  scanMessage.textContent = text;
  scanMessage.classList.toggle('form-message-error', isError);
  scanMessage.hidden = false;
}

function setFocus() {
  if (input) {
      input.focus();
      input.select();
  }
}

function clearPatronState() {
  updateCurrentPatron(null);
  if (scanMessage) {
      scanMessage.hidden = true;
  }
  setFocus();
}

function scheduleReset() {
  if (resetTimer) {
      window.clearTimeout(resetTimer);
  }

  resetTimer = window.setTimeout(() => {
      clearPatronState();
  }, 5000);
}

function updateCurrentPatron(patron) {
  if (!patron) {
      if (focusName) focusName.textContent = 'Waiting for scan';
      if (focusDepartment) focusDepartment.textContent = 'No patron loaded';
      if (focusBarcode) focusBarcode.textContent = 'Barcode hidden';
      return;
  }

  const fullName = `${patron.first_name || ''} ${patron.last_name || ''}`.trim() || 'Unknown patron';
  const department = patron.department || 'Not assigned';

  if (focusName) focusName.textContent = fullName;
  if (focusDepartment) focusDepartment.textContent = department;
  if (focusBarcode) focusBarcode.textContent = 'Barcode hidden';
}

async function loadPatrons() {
  try {
    const response = await fetch('/api/patrons');
    const payload = await response.json();
    patrons = Array.isArray(payload.patrons) ? payload.patrons : [];
  } catch (error) {
    console.error('Unable to load patron records:', error);
    patrons = [];
  }
}

function findPatronByBarcode(barcode) {
  return patrons.find((patron) => normalize(patron.barcode) === normalize(barcode));
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const barcode = String(input?.value ?? '').trim();
    if (!barcode) {
      showMessage('Scan or type a patron barcode first.', true);
      setFocus();
      return;
    }

    const patron = findPatronByBarcode(barcode);
    if (!patron) {
      updateCurrentPatron(null);
      showMessage('Patron not found. Please scan a valid library barcode.', true);
      setFocus();
      return;
    }

    updateCurrentPatron(patron);
    recordAttendanceEntry(patron);
    showMessage(`${patron.first_name || 'Patron'} ${patron.last_name || ''} confirmed.`, false);
    form.reset();
    scheduleReset();
    setFocus();
  });
}

function updatePatronGreeting() {
  const hour = new Date().getHours();
  const greetingText = document.querySelector('#patron-greeting-text');
  const eyebrow = document.querySelector('#patron-greeting-eyebrow');

  if (greetingText) {
    greetingText.textContent = hour < 12 ? 'morning' : 'afternoon';
  }

  if (eyebrow) {
    eyebrow.textContent = hour < 12 ? 'Good morning / Welcome to the library' : 'Good afternoon / Welcome to the library';
  }
}

async function initialize() {
  await loadPatrons();
  updateCurrentPatron(null);
  updatePatronGreeting();
  setFocus();
}

window.addEventListener('load', () => {
  initialize();
});
