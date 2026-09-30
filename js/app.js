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
      /* Restore the weaver's ATHAR, completed nodes, clues, branch and reveal
         BEFORE the first render, so a refresh mid-thread or after the reveal
         lands on the state that was actually saved. Malformed stored data is
         discarded inside data.js and never reaches the renderers. */
      if (NASEEJ.data && typeof NASEEJ.data.hydrateProgress === 'function') {
        NASEEJ.data.hydrateProgress();
      }
      /* Wishlist and demo redemption claims live in their own local documents,
         restored alongside progress but validated separately, so a corrupt
         one cannot cost a weaver their mystery progress. */
      if (NASEEJ.data && typeof NASEEJ.data.hydrateFeatures === 'function') {
        NASEEJ.data.hydrateFeatures();
      }
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
