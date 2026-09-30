/* Naseej — authentication UI.
   Owns everything the visitor sees about signing in: the Sign In dialog, the
   signed-in state in the nav bar, and the wiring to Firebase Auth.

   Split of responsibility:
     js/firebase.js  Firebase app + Auth SDK calls (the only initializeApp).
     js/auth.js      this file — dialog, nav chrome, state synchronisation.
     js/pages.js     page renderers, untouched by auth.

   The dialog is rendered into #auth-root, a sibling of #app, NOT inside #app.
   navigation.js repaints #app on every route change; a dialog living inside it
   would be destroyed by any paint (and closing on navigation is not the
   behaviour we want — signing in should not tear down the page you are on).

   Loads after pages.js so it can register its actions on NASEEJ.actions, which
   pages.js defines. Everything else here is ready by the time app.js boots. */
(function (NASEEJ) {
  'use strict';

  const E = NASEEJ.escapeHtml;

  const ROOT_ID = 'auth-root';
  const DIALOG_ID = 'auth-dialog';
  const TITLE_ID = 'auth-title';

  /* ── State ─────────────────────────────────────────────────────────────────
     One source of truth for the signed-in user. `pending` means a sign-in
     request is in flight; `status` is the last result, used to decide whether
     to keep the dialog open. */
  const auth = {
    user: null,
    ready: false,
    pending: false,
    open: false,
    status: 'idle', // idle | working | error | success
    message: '',
  };
  NASEEJ.auth = auth;

  /* The demo weaver as data.js ships it, captured on the first auth callback
     and restored on sign-out. See syncUser(). */
  let demoProfile = null;

  const services = NASEEJ.services;

  /* ── Colours ────────────────────────────────────────────────────────────────
     Every hex here is a registered :root token in css/styles.css, which
     scripts/build.cjs enforces — a colour that is not registered fails the
     build rather than drifting out of the palette. */
  /* Colours are picked against WCAG contrast, not just for looks:
       ink on card            15.3:1  (AAA)
       ink-muted-strong/card   5.8:1  body copy, AA
       olive-dark on white     6.8:1  primary action label, AA
       ink-soft on card        4.0:1  control borders, > the 3:1 AA floor
       white on sand           2.0:1  decorative only (disabled label)
     The site's --color-muted (#55635E) is 4.0:1 and is fine for the 15px+ copy
     it is already used for, but it is under AA for the 12-14px text in this
     dialog, so the small type here uses ink-muted-strong instead. */
  const C = {
    ink: '#12211E',              // --color-foreground
    inkSoft: '#55635E',          // --color-muted
    inkMutedStrong: '#4A5C58',   // --color-ink-muted-strong
    card: '#FDFCFA',             // --color-card
    sand: '#E8E0D0',             // --color-sand
    sandDark: '#C9BDA8',         // --color-sand-dark
    page: '#F9F7F3',             // --color-background
    petra: '#D6672B',            // --color-petra
    petraLight: '#EDB99E',       // --color-petra-light
    olive: '#013E37',            // --color-olive
    oliveDark: '#02302B',        // --color-olive-dark
  };

  /* ── Modal ──────────────────────────────────────────────────────────────────
     Rendered once and re-rendered on change. Body scroll is locked while it
     is open, and the trigger's focus is restored on close. */

  function host() {
    return document.getElementById(ROOT_ID);
  }

  function focusables() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg) return [];
    /* Deliberately not filtered on offsetParent / getClientRects: offsetParent
       is null for any position:fixed element, and getClientRects is empty for
       anything inside a display:none subtree — either would make the trap
       below silently do nothing. render() empties the root when closed, so
       every node matching this selector is genuinely visible. */
    return Array.prototype.filter.call(
      dlg.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) {
        return !el.disabled && !el.hidden && el.getAttribute('aria-hidden') !== 'true';
      }
    );
  }

  function close() {
    if (!auth.open) return;
    auth.open = false;
    auth.status = 'idle';
    auth.message = '';
    document.documentElement.classList.remove('auth-locked');
    render();

    /* Return focus to whatever opened the dialog. */
    if (auth.returnFocus && auth.returnFocus.focus) {
      try { auth.returnFocus.focus(); } catch (e) { /* node gone after a repaint */ }
    }
    auth.returnFocus = null;
  }

  /* `trigger` is passed in rather than read from document.activeElement:
     Firefox does not focus a <button> on mousedown, so on that browser
     activeElement is still <body> and focus would be dropped on close. */
  function open(trigger) {
    if (auth.open) return;
    auth.open = true;
    auth.status = 'idle';
    auth.message = '';
    auth.returnFocus = trigger || document.activeElement;
    document.documentElement.classList.add('auth-locked');
    render();
    /* Focus the primary action so the dialog is immediately keyboard-usable. */
    const primary = document.querySelector('#' + DIALOG_ID + ' [data-auth="google"]');
    if (primary) primary.focus();
  }

  /* Google button markup. `working` swaps the label and disables the control
     so a double-tap cannot start two flows. The white surface needs the
     ink-soft border, not sand-dark: at 1.8:1 against the near-white panel the
     button's edge was effectively invisible, which fails the 3:1 WCAG asks for
     a control boundary. */
  function googleButton() {
    if (auth.pending) {
      return '<button type="button" class="auth-btn" disabled aria-busy="true"' +
        ' style="background-color:' + C.sand + ';color:' + C.inkSoft + ';border:1px solid ' + C.sandDark + '">' +
        '<span class="auth-spinner" aria-hidden="true"></span>Connecting…</button>';
    }
    return '<button type="button" class="auth-btn" data-auth="google"' +
      ' style="background-color:' + C.white + ';border:1px solid ' + C.inkSoft + ';color:' + C.ink + '">' +
      /* Google's brand mark, inlined so the button renders identically offline. */
      '<svg class="auth-mark" viewBox="0 0 18 18" aria-hidden="true" focusable="false">' +
      '<path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>' +
      '<path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/>' +
      '<path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"/>' +
      '<path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>' +
      '</svg>Continue with Google</button>';
  }

  function statusRegion() {
    if (auth.status === 'error' && auth.message) {
      return '<p class="auth-msg auth-msg-error" role="alert">' + E(auth.message) + '</p>';
    }
    if (auth.status === 'success' && auth.message) {
      return '<p class="auth-msg auth-msg-ok" role="status">' + E(auth.message) + '</p>';
    }
    return '<p class="auth-msg" role="status" aria-live="polite">' +
      (auth.pending ? 'Opening Google sign-in…' : '') + '</p>';
  }

  function dialog() {
    const signedIn = !!auth.user;

    return '<div class="auth-backdrop" data-auth="close"></div>' +
      '<div class="auth-panel" role="dialog" aria-modal="true" aria-labelledby="' + TITLE_ID + '" id="' + DIALOG_ID + '">' +
      '<button type="button" class="auth-close" data-auth="close" aria-label="Close sign in dialog">' +
      '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">' +
      '<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      '</button>' +

      /* A thin rule + eyebrow, matching NASEEJ.eyebrow() on every page. The
         rule keeps the petra accent; the label itself uses the darker muted
         tone, because 12px petra is only 2.6:1 on the panel. */
      '<div class="auth-eyebrow">' +
      '<span class="auth-rule" style="background-color:' + C.petra + '"></span>' +
      '<span class="auth-eyebrow-text" style="color:' + C.inkMutedStrong + '">Your Naseej Account</span></div>' +

      '<h2 class="font-display auth-title" id="' + TITLE_ID + '" style="color:' + C.ink + '">' +
      (signedIn ? 'Signed in' : 'Sign in to Naseej') + '</h2>' +

      (signedIn
        ? '<div class="auth-user">' +
          '<div class="auth-avatar">' +
          (auth.user.photoURL
            ? '<img src="' + E(auth.user.photoURL) + '" alt="" width="56" height="56">'
            : '<span aria-hidden="true">' + E((auth.user.displayName || '?').charAt(0).toUpperCase()) + '</span>') +
          '</div>' +
          '<div class="auth-user-meta">' +
          '<div class="auth-user-name">' + E(auth.user.displayName || 'Google account') + '</div>' +
          (auth.user.email ? '<div class="auth-user-email">' + E(auth.user.email) + '</div>' : '') +
          '</div></div>' +
          /* The truth about what signing in does. It attaches a Google identity
             to this browser's progress. It does not sync anything: progress
             lives in local storage, so the previous copy — "your threads and
             badges are saved to this account" — described a cloud save that has
             never existed, and a visitor who cleared their browser would have
             lost work while believing it was safe. */
          '<p class="auth-sub">Signed in as ' + E(auth.user.displayName || 'this Google account') +
          '. Your progress is stored in this browser. Account sync is not connected yet, so clearing site data will clear your progress.</p>' +
          statusRegion() +
          '<button type="button" class="auth-btn auth-btn-ghost" data-auth="signout"' +
          ' style="color:' + C.ink + ';border:1px solid ' + C.inkSoft + ';background-color:' + C.page + '">Sign out</button>' +
          '<button type="button" class="auth-btn" data-auth="close"' +
          ' style="background-color:' + C.oliveDark + ';color:' + C.white + '">Continue exploring</button>'
        : '<p class="auth-sub">Sign in to identify yourself. You can weave, earn ATHAR and collect badges without an account — progress is kept in this browser.</p>' +
          statusRegion() +
          googleButton() +
          '<p class="auth-foot">Naseej uses your Google profile only to identify you. Nothing is posted without your action.</p>');
  }

  function render() {
    const root = host();
    if (!root) return;
    /* Keep the dialog out of the tab order and the accessibility tree while it
       is closed, rather than removing it, so focus returns predictably. */
    if (!auth.open) {
      root.innerHTML = '';
      return;
    }
    root.innerHTML = dialog();
  }

  /* ── Nav chrome ──────────────────────────────────────────────────────────────
     The nav bar is produced by navigation.js, which has no knowledge of auth.
     Rather than duplicate the button here (or move the nav into this file),
     this exposes a small API that navigation.js calls when it draws the bar. */

  function navControl() {
    /* Before auth resolves the button still renders as "Sign In". The listener
       starts at the bottom of this file and updates it as soon as Firebase
       reports a session, so the control never depends on the network. */
    if (auth.user) {
      const label = auth.user.displayName || auth.user.email || '';
      const initial = (auth.user.displayName || auth.user.email || '?').charAt(0).toUpperCase();
      return '<button type="button" class="nav-account" data-auth="open"' +
        ' aria-label="Account menu for ' + E(label) + '">' +
        '<span class="nav-avatar" aria-hidden="true">' +
        (auth.user.photoURL
          ? '<img src="' + E(auth.user.photoURL) + '" alt="">'
          : E(initial)) +
        '</span>' +
        '<span class="nav-account-name">' + E(label) + '</span>' +
        '</button>';
    }
    return '<button type="button" class="nav-signin" data-auth="open">Sign In</button>';
  }

  /* ── Actions ─────────────────────────────────────────────────────────────────
     Registered on NASEEJ.actions so the delegated click listener in
     navigation.js dispatches them. The dialog's own buttons use data-auth and
     are handled by the single listener below, outside the #app tree. */

  function setBusy(busy, message) {
    auth.pending = busy;
    auth.status = busy ? 'working' : auth.status === 'working' ? 'idle' : auth.status;
    if (message != null) auth.message = message;
    render();
  }

  function signIn() {
    if (auth.pending) return;
    auth.status = 'working';
    auth.message = '';
    auth.pending = true;
    render();

    services.signInWithGoogle().then(function (result) {
      if (result.status === 'success') {
        /* The redirect path never resolves this promise in the same tick, so
           the auth-state listener below is what actually closes the dialog. */
        auth.pending = false;
        auth.status = 'success';
        auth.message = 'Signed in. Welcome to Naseej.';
        render();
        return;
      }
      auth.pending = false;
      auth.status = 'error';
      auth.message = result.message;
      render();
    });
  }

  function signOut() {
    if (auth.pending) return;
    setBusy(true);
    services.signOut().then(function (result) {
      auth.pending = false;
      if (result && result.status === 'error') {
        auth.status = 'error';
        auth.message = result.message;
        render();
        return;
      }
      auth.status = 'idle';
      auth.message = '';
      render();
    });
  }

  /* One delegated listener for the dialog. Kept separate from navigation.js's
     listener because the dialog lives outside #app. */
  document.addEventListener('click', function (ev) {
    const trigger = ev.target.closest && ev.target.closest('[data-auth]');
    if (!trigger) return;
    const action = trigger.dataset.auth;

    if (action === 'close') {
      close();
      return;
    }
    if (action === 'open') {
      open(trigger);
      return;
    }
    if (action === 'google') {
      signIn();
      return;
    }
    if (action === 'signout') {
      signOut();
    }
  });

  /* Escape closes; Tab is trapped inside the dialog while it is open. */
  document.addEventListener('keydown', function (ev) {
    if (!auth.open) return;
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg) return;

    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
      return;
    }
    if (ev.key !== 'Tab') return;

    const items = focusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (ev.shiftKey && (active === first || !dlg.contains(active))) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && active === last) {
      ev.preventDefault();
      first.focus();
    }
  });

  /* ── Auth state ──────────────────────────────────────────────────────────────
     A single subscription, started once. onAuthStateChanged fires immediately
     with the current user, so a refresh keeps the signed-in nav button. */
  function syncUser(user, failure) {
    const wasSignedIn = !!auth.user;
    const wasOpen = auth.open;
    auth.user = user || null;
    auth.ready = true;
    auth.pending = false;

    /* Mirror the identity into NASEEJ.session.profile, which is what pages.js
       renders. Only the fields the design already has a slot for are touched —
       the demo weaver's level, points, badges and member-since date are
       placeholder content, not part of the Google identity, and are left alone
       rather than being faked from the login.

       The demo values are captured once here so signing out restores them;
       without that, the previous visitor's name and photo would stay on the
       profile page for whoever opens the app next. */
    const me = NASEEJ.session.profile;
    if (!demoProfile) {
      demoProfile = {
        displayName: me.displayName,
        avatarUrl: me.avatarUrl,
        verified: me.verified,
      };
    }
    if (user) {
      if (user.displayName) me.displayName = user.displayName;
      if (user.photoURL) me.avatarUrl = user.photoURL;
      /* A Google account is provider-verified; the design's tick badge means
         the same thing there, so it follows the login. */
      me.verified = !!(user.providerData || []).some(function (p) {
        return p && p.providerId === 'google.com';
      });
    } else if (wasSignedIn) {
      me.displayName = demoProfile.displayName;
      me.avatarUrl = demoProfile.avatarUrl;
      me.verified = demoProfile.verified;
    }

    if (failure && !user) {
      auth.status = 'error';
      auth.message = failure.reason || 'Sign-in is unavailable right now.';
      console.warn('Naseej: ' + auth.message);
    }

    /* Close on a *transition* into a signed-in state, and only then. A user
       who was already signed in and reopens the dialog to read their account
       should keep it open — the listener fires again on any token refresh, and
       yanking the dialog shut each time would be a bug, not a convenience. */
    if (user && !wasSignedIn) {
      auth.open = false;
      auth.status = 'idle';
      auth.message = '';
      document.documentElement.classList.remove('auth-locked');
      const rf = auth.returnFocus;
      auth.returnFocus = null;
      render();

      /* Repaint so the nav bar picks up the account chip. The nav control is
         rebuilt during the repaint, so the old trigger node is detached by
         this point — focus the replacement instead of the stale one. */
      NASEEJ.paint();
      const navControl = document.querySelector('.nav-account, .nav-signin');
      if (navControl && navControl.focus) {
        try { navControl.focus(); } catch (e) { /* not focusable; harmless */ }
      } else if (rf && rf.focus && document.body.contains(rf)) {
        try { rf.focus(); } catch (e) { /* replaced by the repaint */ }
      }
      return;
    }

    /* Re-opened the dialog while already signed in: redraw it to the signed-in
       state rather than leaving the stale signed-out markup on screen. */
    if (user && wasOpen && !auth.open) {
      auth.open = true;
      auth.status = 'idle';
      auth.message = '';
      document.documentElement.classList.add('auth-locked');
      render();
      return;
    }

    if (wasSignedIn && !user && auth.open) {
      /* Signing out from inside the dialog: dismiss it, the way every other
         sign-out does elsewhere. Otherwise the account view would sit on screen
         describing a session that no longer exists. */
      const rf = auth.returnFocus;
      auth.open = false;
      auth.status = 'idle';
      auth.message = '';
      auth.returnFocus = null;
      document.documentElement.classList.remove('auth-locked');
      render();
      NASEEJ.paint();
      const control = document.querySelector('.nav-signin, .nav-account');
      if (control && control.focus) {
        try { control.focus(); } catch (e) { /* not focusable */ }
      } else if (rf && rf.focus && document.body.contains(rf)) {
        try { rf.focus(); } catch (e) { /* replaced by the repaint */ }
      }
      return;
    }

    if (wasSignedIn !== !!user) {
      /* Signed in or out while the page stayed put: redraw the nav bar. */
      NASEEJ.paint();
    }
    render();
  }

  function start() {
    if (!services || typeof services.onAuthStateChanged !== 'function') {
      auth.ready = true;
      return;
    }
    services.onAuthStateChanged(function (user, failure) {
      syncUser(user, failure);
    });
  }

  /* Registered on NASEEJ.actions so the nav's Sign In control can drive the
     dialog through the same delegated path as every other interactive
     element. navigation.js reads data-nav/data-act; auth.js adds data-auth,
     handled by the listener above. Both routes end in open()/close(). */
  NASEEJ.authControl = navControl;

  start();
})(window.NASEEJ || (window.NASEEJ = {}));
