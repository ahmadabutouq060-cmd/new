/* Naseej — navigation, app state and shared shell.
   Vanilla port of App.tsx (useState + navigate) and components/Nav.tsx.

   Responsibilities: global state, hash routing, the nav bar and other chrome
   shared by every page, the mount/paint cycle and the two delegated listeners.
   Page-specific behaviour lives in pages.js (NASEEJ.pages / NASEEJ.actions);
   content lives in data.js (NASEEJ.data / NASEEJ.session). */
(function (NASEEJ) {
  'use strict';

  /* ── App state (was useState in App.tsx) ─────────────────────────────────────
     page: 'home' | 'discover' | 'thread' | 'place' | 'profile'             */
  NASEEJ.state = { page: 'home', threadId: null, waypointId: null };

  /* Per-page local state (was useState inside each page component).
     Dropped when a page unmounts, kept when only its params change.
     Always read through NASEEJ.ui: mount() replaces the object wholesale.   */
  NASEEJ.ui = {};

  const APP_ID = 'app';
  const PAGES = ['home', 'discover', 'thread', 'place', 'profile'];

  /* Anything a page or the markup can drive: navigation or an action. */
  const INTERACTIVE = '[data-nav],[data-act]';

  /* ── Markup helpers ─────────────────────────────────────────────────────── */

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }
  NASEEJ.escapeHtml = escapeHtml;

  /* Attribute bundle used to drive navigation from markup (was onClick). */
  function navAttrs(page, threadId, waypointId) {
    return 'data-nav="' + page + '"' +
      (threadId != null ? ' data-thread="' + threadId + '"' : '') +
      (waypointId != null ? ' data-wp="' + waypointId + '"' : '');
  }
  NASEEJ.navAttrs = navAttrs;

  /* Small eyebrow label: hairline + uppercase caption (used across pages). */
  NASEEJ.eyebrow = function (opts) {
    const rule = '<div class="' + opts.width + ' h-px" style="background-color:' + opts.color + '"></div>';
    return '<div class="inline-flex items-center gap-2 ' + (opts.margin || 'mb-3') +
      '" style="color:' + opts.color + '">' + rule +
      '<span class="text-xs font-body font-medium tracking-widest uppercase">' + opts.text + '</span>' +
      (opts.trailingRule ? rule : '') + '</div>';
  };

  /* ── Routing (state <-> location.hash so Back / refresh work) ─────────────── */

  function hashFor(page, threadId, waypointId) {
    let h = '#/' + page;
    if ((page === 'thread' || page === 'place') && threadId != null) {
      h += '/' + threadId;
      if (page === 'place' && waypointId != null) h += '/' + waypointId;
    }
    return h;
  }

  function navigate(page, threadId, waypointId) {
    if (threadId !== undefined) NASEEJ.state.threadId = threadId;
    if (waypointId !== undefined) NASEEJ.state.waypointId = waypointId;
    NASEEJ.state.page = page;

    const h = hashFor(page, NASEEJ.state.threadId, NASEEJ.state.waypointId);
    if (location.hash === h) {
      /* React: setCurrentPage() with an identical value bails out of the
         re-render, so each page's useState survives. Keep NASEEJ.ui, just
         scroll and repaint. */
      window.scrollTo(0, 0);
      NASEEJ.paint();
    } else location.hash = h; // hashchange -> route() -> mount()
  }
  NASEEJ.navigate = navigate;

  /* Which page is currently mounted. React re-renders one page component when
     only its props change, so thread -> thread and place -> place keep their
     local state; leaving the page unmounts it and clears that state.          */
  let mountedPage = null;

  /* A route is the whole truth about which thread/waypoint is being shown:
     whatever the hash does not mention is cleared, never inherited from the
     previous route. Otherwise `#/thread` after a mystery thread would silently
     reopen that thread, and `#/place/3/2` -> `#/place/4` would show waypoint 2
     of thread 4.
     An id that is not a number, or names no thread, is reported and then
     treated as absent — data.getThread() still applies the documented fallback
     to the default thread. */
  function readId(part, label) {
    if (part == null || part === '') return null;
    const n = +part;
    if (isNaN(n)) {
      console.warn('Naseej: "' + part + '" is not a valid ' + label + ' id — ignoring it.');
      return null;
    }
    return n;
  }

  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    if (PAGES.indexOf(parts[0]) < 0) parts.splice(0, parts.length, 'home'); // first visit -> home
    const samePage = mountedPage === parts[0];

    let threadId = readId(parts[1], 'thread');
    if (threadId != null && NASEEJ.data && !NASEEJ.data.hasThread(threadId)) {
      console.warn('Naseej: thread ' + threadId + ' does not exist — falling back to the default thread.');
      threadId = null;
    }
    const waypointId = readId(parts[2], 'waypoint');

    NASEEJ.state.page = parts[0];
    NASEEJ.state.threadId = threadId;
    NASEEJ.state.waypointId = waypointId;
    mountedPage = parts[0];
    mount(!samePage);
  }
  NASEEJ.route = route;

  window.addEventListener('hashchange', route);

  /* ── Nav (components/Nav.tsx) ──────────────────────────────────────────────
     The Sign In control is drawn by js/auth.js (NASEEJ.authControl) so the
     signed-in state can swap it for the account chip without this file knowing
     anything about Firebase. The nav-* classes are layout hooks for the
     responsive layer in css/styles.css; they carry no styling of their own. */
  NASEEJ.navBar = function () {
    const items = [
      ['Home', 'home'],
      ['Discover', 'discover'],
      ['Threads', 'thread'],
      ['Community', 'profile'],
    ];
    const assets = NASEEJ.data.assets;
    return '<nav class="nav-root fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4"' +
      ' style="background-color:rgba(249,247,243,0.95);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid #E8E0D0">' +
      '<button ' + navAttrs('home') + ' class="nav-logo flex items-center gap-3 group">' +
      '<img src="' + assets.logoIcon + '" alt="Naseej emblem" style="width:39px;height:34px;object-fit:contain">' +
      '<img src="' + assets.logoText + '" alt="Naseej" style="width:74px;height:34px;object-fit:contain"></button>' +
      '<div class="nav-links flex items-center gap-8">' + items.map(function (item) {
        return '<button ' + navAttrs(item[1]) +
          ' class="text-sm font-medium transition-colors"' +
          ' style="color:' + (NASEEJ.state.page === item[1] ? '#D98A6C' : '#2C2417') + '">' + item[0] + '</button>';
      }).join('') + '</div>' +
      '<div class="nav-actions flex items-center gap-3">' +
      (NASEEJ.authControl ? NASEEJ.authControl() :
        '<button ' + navAttrs('profile') +
        ' class="text-sm font-medium px-5 py-2 rounded-full transition-all" style="color:#2C2417;border:1px solid #C9BDA8">Sign In</button>') +
      '<button ' + navAttrs('discover') +
      ' class="nav-cta text-sm font-medium px-5 py-2 rounded-full transition-all" style="background-color:#6B8E23;color:white">Start Naseej</button>' +
      '</div></nav>';
  };

  /* ── Mount / repaint ──────────────────────────────────────────────────────── */

  /* innerHTML destroys the focused node, so React's reconciliation behaviour
     (focus survives a re-render) is restored by re-focusing the equivalent
     control after the swap. Identity = id, else data-* attrs + position. */
  function focusKey(el) {
    if (!el || !el.tagName) return '';
    const d = el.dataset || {};
    return [el.tagName, d.nav || '', d.act || '', d.v || '', d.thread || '', d.wp || ''].join('|');
  }

  function paint() {
    const host = document.getElementById(APP_ID);
    const render = NASEEJ.pages && NASEEJ.pages[NASEEJ.state.page];
    if (!host || !render) return;

    const active = document.activeElement;
    const restore = !!(active && host.contains(active));
    const key = restore ? focusKey(active) : '';
    const byId = restore && active.id ? active.id : '';
    let idx = -1;
    if (restore && !byId) {
      idx = Array.prototype.indexOf.call(host.querySelectorAll(INTERACTIVE), active);
    }

    host.innerHTML = NASEEJ.navBar() + render();

    if (restore) {
      let target = null;
      if (byId) {
        target = document.getElementById(byId);
      } else if (idx >= 0) {
        const candidate = host.querySelectorAll(INTERACTIVE)[idx];
        if (candidate && focusKey(candidate) === key) target = candidate;
      }
      if (target && target.focus) target.focus();
    }

    /* The library keeps a live <input>, so it patches itself instead of
       re-rendering the whole page (would drop focus while typing). */
    if (NASEEJ.state.page === 'discover' && NASEEJ.updateLibrary) NASEEJ.updateLibrary();
  }
  NASEEJ.paint = paint;

  function mount(fresh) {
    /* `fresh` gates only the page-local state reset. App.tsx's navigate() called
       window.scrollTo(0, 0) unconditionally, so scrolling stays unconditional. */
    if (fresh) {
      NASEEJ.ui = NASEEJ.state.page === 'discover'
        ? { category: 'All', search: '', city: null }
        : {};
    }
    window.scrollTo(0, 0);
    paint();
  }
  /* `mount` stays private: it is the reset half of the cycle and callers only
     ever need `paint` to re-render in place (e.g. after auth state loads). */

  /* ── Events (was JSX onClick / onChange) ────────────────────────────────────
     One delegated listener per event type for the whole app: markup carries
     data-nav / data-act / data-v instead of inline handlers. */

  document.addEventListener('click', function (ev) {
    const el = ev.target.closest && ev.target.closest(INTERACTIVE);
    if (!el) return;

    if (el.dataset.nav) {
      navigate(
        el.dataset.nav,
        el.dataset.thread != null ? +el.dataset.thread : undefined,
        el.dataset.wp != null ? +el.dataset.wp : undefined
      );
      return;
    }

    /* Page behaviour is owned by pages.js; an unknown action is a no-op. */
    const handler = NASEEJ.actions && NASEEJ.actions[el.dataset.act];
    if (handler) handler(el.dataset.v);
  });

  document.addEventListener('input', function (ev) {
    if (ev.target.id !== 'lib-search') return;
    NASEEJ.ui.search = ev.target.value;
    if (NASEEJ.updateLibrary) NASEEJ.updateLibrary();
  });
})(window.NASEEJ || (window.NASEEJ = {}));
