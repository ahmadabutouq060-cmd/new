/* Naseej — bootstrap.
   First visit with no hash lands on the landing page.

   Runs last: data.js, navigation.js and pages.js must already be in place. */
(function (NASEEJ) {
  'use strict';

  function boot() {
    if (!NASEEJ || typeof NASEEJ.route !== 'function') {
      console.error('Naseej: scripts did not load — check the script order in index.html.');
      return;
    }
    /* A stale/invalid hash should not keep the visitor off the site, but a
       genuinely broken renderer is a real error worth surfacing. */
    try {
      NASEEJ.route();
    } catch (err) {
      console.error('Naseej: failed to render ' + (NASEEJ.state && NASEEJ.state.page) + ' (' + err.message + ').');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.NASEEJ || (window.NASEEJ = {}));
