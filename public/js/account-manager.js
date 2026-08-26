const accountForm = document.getElementById('account-form');
const accountMessage = document.getElementById('account-message');
const accountsList = document.getElementById('accounts-list');

function showMessage(text) {
  accountMessage.textContent = text;
  accountMessage.hidden = false;
}

async function loadAccounts() {
  const response = await fetch('/api/accounts');
  if (response.status === 401) {
    window.location.href = '/admin-login';
    return;
  }
  const { accounts } = await response.json();
  accountsList.replaceChildren(...accounts.map((account) => {
    const row = document.createElement('div');
    const details = document.createElement('div');
    const name = document.createElement('strong');
    const username = document.createElement('span');
    const button = document.createElement('button');
    row.className = 'account-row';
    name.textContent = account.name;
    username.textContent = `@${account.username}`;
    button.className = 'danger-button';
    button.type = 'button';
    button.textContent = 'Delete';
    button.dataset.accountId = account.id;
    details.append(name, username);
    row.append(details, button);
    return row;
  }));
  accountsList.querySelectorAll('[data-account-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const response = await fetch(`/api/accounts/${button.dataset.accountId}`, { method: 'DELETE' });
      if (response.ok) loadAccounts();
      else showMessage((await response.json()).error || 'Unable to delete account.');
    });
  });
}

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(new FormData(accountForm)))
  });
  if (!response.ok) {
    showMessage((await response.json()).error || 'Unable to create account.');
    return;
  }
  accountForm.reset();
  accountMessage.hidden = true;
  loadAccounts();
});

document.getElementById('logout-button').addEventListener('click', () => {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = '<form method="dialog" class="logout-dialog-content"><h2>Sign out?</h2><p>Your current session will end on this device.</p><div class="logout-dialog-actions"><button value="cancel" class="secondary-button">Cancel</button><button value="confirm" class="danger-button">Sign out</button></div></form>';
  document.body.append(dialog);
  dialog.addEventListener('close', async () => {
    if (dialog.returnValue === 'confirm') {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/admin-login';
    }
    dialog.remove();
  }, { once: true });
  dialog.showModal();
});

loadAccounts();