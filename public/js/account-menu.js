const accountMenu = document.querySelector('.account-menu');

function createLogoutDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'logout-dialog';
  dialog.innerHTML = '<form method="dialog" class="logout-dialog-content"><h2>Sign out?</h2><p>Your current session will end on this device.</p><div class="logout-dialog-actions"><button value="cancel" class="secondary-button">Cancel</button><button value="confirm" class="danger-button">Sign out</button></div></form>';
  document.body.append(dialog);
  return dialog;
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin-login';
}

if (accountMenu) {
  const accountName = accountMenu.querySelector('.status-pill > span:nth-child(2)');
  const accountButton = accountMenu.querySelector('.dropdown-item:first-child');
  const adminButton = accountMenu.querySelector('.dropdown-item:nth-child(2)');
  const logoutButton = accountMenu.querySelector('.dropdown-item.danger');

  fetch('/api/auth/me').then((response) => response.json()).then(({ account }) => {
    if (account?.name && accountName) accountName.textContent = account.name;
    if (accountButton && account?.role === 'admin') accountButton.textContent = 'Account manager';
    if (adminButton) adminButton.hidden = true;
  });

  accountButton?.addEventListener('click', () => { window.location.href = '/account-manager'; });
  logoutButton?.addEventListener('click', () => {
    const dialog = createLogoutDialog();
    dialog.addEventListener('close', () => {
      if (dialog.returnValue === 'confirm') logout();
      dialog.remove();
    }, { once: true });
    dialog.showModal();
  });
}