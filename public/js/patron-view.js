const form = document.querySelector('#patron-scan-form');
const input = document.querySelector('#patron-scan-input');
const focusName = document.querySelector('#focus-name');
const focusDepartment = document.querySelector('#focus-department');
const focusBarcode = document.querySelector('#focus-barcode');
const scanMessage = document.querySelector('#scan-message');

const ATTENDANCE_STORAGE_KEY = 'libspace-attendance-monitoring';
const ATTENDANCE_EVENT_NAME = 'libspace-attendance-updated';

/*
 * Service modal
 */
const serviceModal = document.querySelector('#service-modal');
const servicePatronName = document.querySelector('#service-patron-name');
const serviceButtons = document.querySelectorAll('[data-service]');
const serviceCloseButtons = document.querySelectorAll('[data-close-service-modal]');

/*
 * State
 */
let patrons = [];
let resetTimer = null;
let selectedPatron = null;

/*
 * Service names displayed in the attendance table.
 */
const SERVICE_NAMES = {
  printing: 'Printing Services',
  internet: 'Internet Room',
  circulation: 'Library Circulation',
  research: 'Undergraduate Research',
  periodicals: 'Periodicals Reading Area',
  discussion: 'Discussion Room',
  consultation: "Librarian's Consultation"
};

const normalize = (value) =>
  String(value ?? '').trim().toLowerCase();


/* ============================================================
   ATTENDANCE STORAGE
   ============================================================ */

function readAttendanceEntries() {
  try {
    return JSON.parse(
      localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '[]'
    );
  } catch (error) {
    console.error('Unable to read attendance records:', error);
    return [];
  }
}


function writeAttendanceEntries(entries) {
  localStorage.setItem(
    ATTENDANCE_STORAGE_KEY,
    JSON.stringify(entries)
  );

  window.dispatchEvent(
    new CustomEvent(
      ATTENDANCE_EVENT_NAME,
      {
        detail: {
          entries
        }
      }
    )
  );
}


/* ============================================================
   RECORD SERVICE ATTENDANCE
   ============================================================ */

function recordServiceAttendanceEntry(patron, service) {
  const entry = {
    id: crypto.randomUUID(),
    barcode: patron.barcode || '',
    name:
      `${patron.first_name || ''} ${patron.last_name || ''}`.trim() ||
      'Unknown patron',
    department: patron.department || 'Not assigned',
    service,
    checkedInAt: new Date().toISOString(),
    status: 'Checked in'
  };

  const nextEntries = [
    entry,
    ...readAttendanceEntries()
  ];

  writeAttendanceEntries(nextEntries);

  return entry;
}


/* ============================================================
   MESSAGES
   ============================================================ */

function showMessage(text, isError = false) {
  if (!scanMessage) return;

  scanMessage.textContent = text;
  scanMessage.classList.toggle(
    'form-message-error',
    isError
  );

  scanMessage.hidden = false;
}


function clearMessage() {
  if (!scanMessage) return;

  scanMessage.textContent = '';
  scanMessage.hidden = true;
  scanMessage.classList.remove('form-message-error');
}


/* ============================================================
   FOCUS
   ============================================================ */

function setFocus() {
  if (!input) return;

  input.focus();
  input.select();
}


/* ============================================================
   CURRENT PATRON DISPLAY
   ============================================================ */

function updateCurrentPatron(patron) {
  if (!patron) {
    if (focusName) {
      focusName.textContent = 'Waiting for scan';
    }

    if (focusDepartment) {
      focusDepartment.textContent = 'No patron loaded';
    }

    if (focusBarcode) {
      focusBarcode.textContent = 'Barcode hidden';
    }

    return;
  }

  const fullName =
    `${patron.first_name || ''} ${patron.last_name || ''}`.trim() ||
    'Unknown patron';

  const department =
    patron.department || 'Not assigned';

  if (focusName) {
    focusName.textContent = fullName;
  }

  if (focusDepartment) {
    focusDepartment.textContent = department;
  }

  if (focusBarcode) {
    focusBarcode.textContent = 'Barcode hidden';
  }
}


/* ============================================================
   SERVICE MODAL
   ============================================================ */

function openServiceModal(patron) {
  if (!serviceModal) {
    console.error('Service modal not found.');
    return;
  }

  if (!patron) {
    console.error(
      'No patron was provided to openServiceModal().'
    );
    return;
  }

  /*
   * THIS is the patron that will be used when
   * the service button is selected.
   */
  selectedPatron = patron;

  const fullName =
    `${patron.first_name || ''} ${patron.last_name || ''}`.trim() ||
    'Patron';

  if (servicePatronName) {
    servicePatronName.textContent = fullName;
  }

  serviceModal.classList.remove('hidden');

  serviceModal.setAttribute(
    'aria-hidden',
    'false'
  );

  document.body.style.overflow = 'hidden';

  console.log(
    'Service modal opened for:',
    fullName
  );
}


function closeServiceModal() {
  if (!serviceModal) return;

  serviceModal.classList.add('hidden');

  serviceModal.setAttribute(
    'aria-hidden',
    'true'
  );

  document.body.style.overflow = '';

  /*
   * Do not clear selectedPatron here yet.
   * The service button clears it after recording.
   */

  setFocus();
}


/* ============================================================
   MODAL CLOSE CONTROLS
   ============================================================ */

serviceCloseButtons.forEach((button) => {
  button.addEventListener(
    'click',
    closeServiceModal
  );
});


/*
 * Close when clicking directly on the backdrop.
 */
if (serviceModal) {
  serviceModal.addEventListener('click', (event) => {
    if (
      event.target.classList.contains('modal-backdrop')
    ) {
      closeServiceModal();
    }
  });
}


/*
 * Escape key
 */
document.addEventListener('keydown', (event) => {
  if (
    event.key === 'Escape' &&
    serviceModal &&
    !serviceModal.classList.contains('hidden')
  ) {
    closeServiceModal();
  }
});


/* ============================================================
   SERVICE BUTTONS
   ============================================================ */

serviceButtons.forEach((button) => {
  button.addEventListener('click', () => {

    /*
     * The patron should have been stored when
     * the modal opened.
     */
    if (!selectedPatron) {
      console.error(
        'No patron selected for service.'
      );
      return;
    }

    const serviceKey =
      button.dataset.service;

    if (!serviceKey) {
      console.error(
        'Service button is missing data-service.'
      );
      return;
    }

    const serviceName =
      SERVICE_NAMES[serviceKey] || serviceKey;

    /*
     * Create the attendance/service record.
     */
    const entry =
  recordServiceAttendanceEntry(
    selectedPatron,
    serviceName
  );

console.log(
  'Service attendance recorded:',
  entry
);

showMessage(
  `${selectedPatron.first_name || 'Patron'} ${
    selectedPatron.last_name || ''
  } selected ${serviceName}.`,
  false
);

closeServiceModal();

selectedPatron = null;

/*
 * Give the patron 3 seconds to see the confirmation,
 * then return the page to its ready-to-scan state.
 */
scheduleReset();
  });
});


/* ============================================================
   RESET
   ============================================================ */

function clearPatronState() {
  updateCurrentPatron(null);

  if (scanMessage) {
    scanMessage.hidden = true;
  }

  selectedPatron = null;

  setFocus();
}


function scheduleReset() {
  if (resetTimer) {
    window.clearTimeout(resetTimer);
  }

  resetTimer = window.setTimeout(() => {
    clearPatronState();
  }, 3000);
}


/* ============================================================
   LOAD PATRONS
   ============================================================ */

async function loadPatrons() {
  try {
    const response =
      await fetch('/api/patrons');

    const payload =
      await response.json();

    patrons =
      Array.isArray(payload.patrons)
        ? payload.patrons
        : [];

  } catch (error) {

    console.error(
      'Unable to load patron records:',
      error
    );

    patrons = [];
  }
}


/* ============================================================
   FIND PATRON
   ============================================================ */

function findPatronByBarcode(barcode) {
  return patrons.find(
    (patron) =>
      normalize(patron.barcode) ===
      normalize(barcode)
  );
}


/* ============================================================
   BARCODE SCAN
   ============================================================ */

if (form) {
  form.addEventListener(
    'submit',
    (event) => {

      event.preventDefault();

      const barcode =
        String(input?.value ?? '').trim();


      /*
       * Empty barcode
       */
      if (!barcode) {
        showMessage(
          'Scan or type a patron barcode first.',
          true
        );

        setFocus();
        return;
      }


      clearMessage();


      /*
       * Find patron
       */
      const patron =
        findPatronByBarcode(barcode);


      /*
       * Patron not found
       */
      if (!patron) {

        selectedPatron = null;

        updateCurrentPatron(null);

        showMessage(
          'Patron not found. Please scan a valid library barcode.',
          true
        );

        setFocus();
        return;
      }


      /*
       * Patron found
       */
      updateCurrentPatron(patron);


      /*
       * IMPORTANT:
       *
       * We DO NOT record attendance here anymore.
       *
       * The attendance record will only be created after
       * the patron selects a service.
       */


      showMessage(
        `${patron.first_name || 'Patron'} ${
          patron.last_name || ''
        } verified.`,
        false
      );


      /*
       * Clear barcode input.
       */
      form.reset();


      /*
       * Open service selection.
       */
      openServiceModal(patron);

    }
  );
}


/* ============================================================
   GREETING
   ============================================================ */

function updatePatronGreeting() {
  const hour =
    new Date().getHours();

  const greetingText =
    document.querySelector(
      '#patron-greeting-text'
    );

  const eyebrow =
    document.querySelector(
      '#patron-greeting-eyebrow'
    );


  /*
   * Morning
   */
  if (hour < 12) {

    if (greetingText) {
      greetingText.textContent =
        'morning';
    }

    if (eyebrow) {
      eyebrow.textContent =
        'Good morning / Welcome to the library';
    }

    return;
  }


  /*
   * Afternoon
   */
  if (hour < 18) {

    if (greetingText) {
      greetingText.textContent =
        'afternoon';
    }

    if (eyebrow) {
      eyebrow.textContent =
        'Good afternoon / Welcome to the library';
    }

    return;
  }


  /*
   * Evening
   */
  if (greetingText) {
    greetingText.textContent =
      'evening';
  }

  if (eyebrow) {
    eyebrow.textContent =
      'Good evening / Welcome to the library';
  }
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initialize() {
  await loadPatrons();

  updateCurrentPatron(null);

  updatePatronGreeting();

  setFocus();
}


window.addEventListener(
  'load',
  () => {
    initialize();
  }
);