const form = document.querySelector('#registration-form');
const message = document.querySelector('#registration-message');
const registeredCount = document.querySelector('#registered-count');

async function loadPatronCount() {
  try {
    const response = await fetch('/api/patrons');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load patron count');
    registeredCount.textContent = String(Array.isArray(payload.patrons) ? payload.patrons.length : 0);
  } catch (error) {
    registeredCount.textContent = '0';
    console.error(error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch('/api/patrons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to register patron');

    form.reset();
    message.textContent = 'Patron registered successfully.';
    message.classList.remove('form-message-error');
    message.hidden = false;
    await loadPatronCount();
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('form-message-error');
    message.hidden = false;
    form.elements.barcode?.focus();
  }
});

loadPatronCount();
