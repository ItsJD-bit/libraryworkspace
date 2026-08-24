const STORAGE_KEY = 'library-workspace-patrons';
const form = document.querySelector('#registration-form');
const message = document.querySelector('#registration-message');
const registeredCount = document.querySelector('#registered-count');

const loadPatrons = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const savePatrons = (patrons) => localStorage.setItem(STORAGE_KEY, JSON.stringify(patrons));
const normalizeBarcode = (barcode) => barcode.trim().toLowerCase();

function updateCount() {
  registeredCount.textContent = loadPatrons().length;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const patrons = loadPatrons();
  const barcodeExists = patrons.some((patron) => normalizeBarcode(patron.barcode) === normalizeBarcode(data.barcode));

  if (barcodeExists) {
    message.textContent = 'This barcode is already registered. Use a different barcode.';
    message.classList.add('form-message-error');
    message.hidden = false;
    form.elements.barcode.focus();
    return;
  }

  const nextId = patrons.reduce((highest, patron) => Math.max(highest, Number(patron.id) || 0), 0) + 1;
  patrons.push({ id: nextId, ...data });
  savePatrons(patrons);
  form.reset();
  message.textContent = 'Patron registered successfully.';
  message.classList.remove('form-message-error');
  message.hidden = false;
  updateCount();
});

window.addEventListener('storage', updateCount);
updateCount();
