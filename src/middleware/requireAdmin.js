export function requireAdmin(request, response, next) {
  if (request.session?.account?.role === 'admin') {
    next();
    return;
  }

  response.status(401).json({ error: 'Admin authentication required.' });
}

export function requireAdminPage(request, response, next) {
  if (request.session?.account?.role === 'admin') {
    next();
    return;
  }

  response.redirect('/admin-login');
}