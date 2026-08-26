const form = document.getElementById('admin-login-form');
const message = document.getElementById('login-message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (response.ok) {
    window.location.href = '/';
    return;
  }
  message.textContent = (await response.json()).error || 'Unable to sign in.';
  message.hidden = false;
});