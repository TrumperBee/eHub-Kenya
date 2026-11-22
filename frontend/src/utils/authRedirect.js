// Destination used after login, registration and username setup.
//
// Auth guards put the original location in `state.from`; a link can also ask
// for a destination with ?redirect=/some/page. Everything else goes home.
// Only internal absolute paths are accepted so a query param cannot be used
// as an open redirect.

const safePath = (value) => {
  if (typeof value !== 'string') return '';
  const path = value.trim();
  return path.startsWith('/') && !path.startsWith('//') ? path : '';
};

export function resolveAuthRedirect(location) {
  const params = new URLSearchParams(location?.search || '');
  const requested =
    safePath(params.get('redirect')) ||
    safePath(params.get('from')) ||
    safePath(params.get('next'));
  if (requested) return requested;

  const state = location?.state || {};
  const from = state.from ?? state.redirect ?? state.redirectTo;

  if (typeof from === 'string') {
    return safePath(from) || '/';
  }

  if (from && typeof from === 'object') {
    const path = safePath(`${from.pathname || '/'}${from.search || ''}${from.hash || ''}`);
    return path || '/';
  }

  return '/';
}

// A brand-new Google user still has to pick a username. Once that is done,
// sending them back to the setup page would trap them there, so treat it as
// "no saved destination".
export function resolvePostSetupRedirect(location) {
  const target = resolveAuthRedirect(location);
  return target.startsWith('/setup-username') ? '/' : target;
}
