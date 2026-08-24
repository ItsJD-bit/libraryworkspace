document.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link || link.target || link.origin !== window.location.origin || link.pathname === window.location.pathname || link.hash) return;

  event.preventDefault();
  document.body.classList.add('page-leave');
  window.setTimeout(() => { window.location.href = link.href; }, 180);
});