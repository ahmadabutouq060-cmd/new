/* Naseej — Firebase services (Authentication).
 *
 * This is a plain classic script: it must never contain a static `import`,
 * because index.html loads it with a normal <script> tag. A static import
 * throws
 *   SyntaxError: Cannot use import statement outside a module
 * on every page load. The SDK is therefore fetched lazily with dynamic
 * import(), which *is* allowed here, and only when a service is first
 * requested — a visitor who never touches Sign In never downloads it.
 *
 * Only the modules actually used are imported: firebase-app.js and
 * firebase-auth.js. Firestore and Analytics are not part of the auth flow, so
 * they are not loaded (see `load()`).
 *
 * There is exactly ONE Firebase app initialisation, here. No other file calls
 * initializeApp(); js/auth.js drives this module through NASEEJ.services.
 *
 * Public surface (all of it on NASEEJ.services):
 *   isEnabled()          -> boolean
 *   ready()              -> Promise<{ app, auth, analytics? } | { enabled:false, reason }>
 *   current()            -> the resolved bundle, or null
 *   signInWithGoogle()   -> Promise<{ status }>  (popup on desktop, redirect on mobile)
 *   signOut()            -> Promise<void>
 *   onAuthStateChanged() -> unsubscribe fn; fires immediately with the current user
 *
 * To disable authentication without touching any other file, set ENABLED=false
 * below. Nothing else in the app depends on Firebase being reachable: the
 * Sign In UI degrades to its signed-out state and the rest of the site is
 * entirely static.
 */
(function (NASEEJ) {
  'use strict';

  /* Flip to false to turn the auth layer off (offline work, SDK outage). */
  const ENABLED = true;

  /* Firebase web app config. The API key identifies the project; it is not a
     secret, but it is still environment-specific, so keep it here rather than
     scattered through the code. Keep it in sync with the console when the
     project is renamed or the web app is re-created. */
  const config = {
    apiKey: 'AIzaSyD_rQlgTwafZOOgB_B0FLAGW5JjkE1w5-M',
    authDomain: 'naseej-89fa4.firebaseapp.com',
    projectId: 'naseej-89fa4',
    storageBucket: 'naseej-89fa4.firebasestorage.app',
    messagingSenderId: '759285569748',
    appId: '1:759285569748:web:b093b2dad3524866d50341',
    measurementId: 'G-NJHGGEM045',
  };

  const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';

  const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];

  const GOOGLE_PROVIDER_ID = 'google.com';

  let loading = null;   // in-flight/settled SDK load, shared by all callers
  let instance = null;  // { app, auth, ... }, set once the SDK has loaded

  function disabled() {
    return {
      enabled: false,
      reason: 'Firebase Authentication is disabled in js/firebase.js (ENABLED = false).',
    };
  }

  function fail(message) {
    return { enabled: false, reason: message };
  }

  /* ── Platform detection ────────────────────────────────────────────────────
     Firebase's popup flow opens a new window, which mobile browsers block in
     a surprising number of cases (in-app webviews, iOS standalone PWA, some
     Android browsers). The redirect flow navigates away and comes back, which
     those browsers handle correctly. So: popup on desktop, redirect on mobile.
     If a desktop popup is blocked anyway we fall back to the redirect. */

  function prefersRedirect() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.matchMedia && window.matchMedia('(max-width: 48rem)').matches;
    const mobileUA = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
    return !!(coarse || narrow || mobileUA);
  }

  /* ── Error messages ─────────────────────────────────────────────────────────
     Firebase error codes are stable; their default messages are not always
     actionable. Map the ones a visitor can actually hit to plain English. The
     CONFIGURATION_NOT_FOUND family means the provider was never enabled in the
     console, which is a setup problem rather than anything the visitor did. */

  const ERROR_MESSAGES = {
    'auth/popup-closed-by-user': 'The sign-in window closed before it finished. Please try again.',
    'auth/cancelled-popup-request': 'Another sign-in window is already open.',
    'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
    'auth/operation-not-allowed': 'Google sign-in is not switched on for this project yet. The Naseej team needs to enable it in the Firebase console.',
    'auth/unauthorized-domain': 'This domain is not authorised for sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
    'auth/network-request-failed': 'Network error while signing in. Check your connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/user-disabled': 'This account has been disabled.',
    /* The one error a visitor genuinely cannot fix, so it says what is wrong
       rather than asking them to retry. */
    CONFIGURATION_NOT_FOUND: 'Google sign-in is not switched on for this project yet. The Naseej team needs to enable it in the Firebase console.',
  };

  /* The Auth SDK wraps backend failures in a FirebaseError, but when the
     project config itself is missing the v3 endpoint returns
     CONFIGURATION_NOT_FOUND *before* the SDK has built its provider, and the
     rejection that reaches us is a bare TypeError with the message "Error".
     Anything that empty, plus the internal-error code, means "the sign-in
     provider is not set up" rather than "something went wrong at the user". */
  function isConfigFailure(err) {
    if (!err) return false;
    const msg = String(err.message || '');
    return (
      msg.indexOf('CONFIGURATION_NOT_FOUND') >= 0 ||
      err.code === 'auth/internal-error' ||
      (err instanceof TypeError && /reading 'create'|is not a function/.test(msg))
    );
  }

  function describe(err) {
    if (!err) return 'Sign-in failed. Please try again.';
    const code = err.code || '';
    if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    /* The REST layer reports a bare uppercase reason, not an auth/ code. */
    const msg = String(err.message || '');
    if (msg.indexOf('CONFIGURATION_NOT_FOUND') >= 0) return ERROR_MESSAGES.CONFIGURATION_NOT_FOUND;
    if (isConfigFailure(err)) return ERROR_MESSAGES.CONFIGURATION_NOT_FOUND;
    if (err.name === 'FirebaseError' && msg && msg !== 'Error') {
      return msg.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/[\w-]+\)\.?$/, '');
    }
    /* A rejection with no usable message is the SDK failing to build its own
       request; say so rather than showing the literal string "Error". */
    if (!msg || msg === 'Error') {
      return 'Sign-in is not available right now. Please try again in a moment.';
    }
    return msg;
  }

  /* ── Provider preflight ──────────────────────────────────────────────────────
     One cheap call to the same endpoint the SDK uses, so an unconfigured
     project produces an accurate message instead of a dead popup. Cached for
     the session, and a failure here is never fatal: the sign-in attempt still
     goes ahead and reports whatever the SDK says. */
  let configProbe = null;

  function probeProvider() {
    if (configProbe) return configProbe;
    const url =
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=' +
      encodeURIComponent(config.apiKey);
    configProbe = fetch(url)
      .then(function (res) {
        return res.json().then(
          function (data) {
            return data && data.error ? data.error.message || '' : '';
          },
          function () {
            return '';
          }
        );
      })
      .catch(function () {
        /* Offline or blocked: fall through and let the real attempt decide. */
        return '';
      });
    return configProbe;
  }

  /* ── SDK load ───────────────────────────────────────────────────────────────
     Only firebase-app.js and firebase-auth.js are imported. Importing the
     Firestore/Analytics modules would download several hundred kilobytes that
     no auth code path touches. */
  function load() {
    if (!ENABLED) return Promise.resolve(disabled());
    if (loading) return loading;

    const missing = REQUIRED_KEYS.filter(function (key) {
      return !config[key];
    });
    if (missing.length > 0) {
      return Promise.resolve(fail('Firebase config is missing: ' + missing.join(', ')));
    }

    loading = Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
    ])
      .then(function (modules) {
        const firebaseApp = modules[0];
        const firebaseAuth = modules[1];

        const app = firebaseApp.initializeApp(config);
        const auth = firebaseAuth.getAuth(app);

        /* Persist the session across reloads so a signed-in visitor stays
           signed in. This is the default, but it is set explicitly because the
           sign-in UI depends on the user surviving a refresh. */
        return firebaseAuth
          .setPersistence(auth, firebaseAuth.browserLocalPersistence)
          .catch(function () {
            /* Private browsing can refuse persistence; the session then lasts
               for this tab only, which is not worth failing sign-in over. */
            return null;
          })
          .then(function () {
            instance = {
              enabled: true,
              app: app,
              auth: auth,
              firebaseAuth: firebaseAuth,
              /* The provider is created once here so both the popup and the
                 redirect path sign in through the identical configuration. */
              provider: new firebaseAuth.GoogleAuthProvider(),
              providerId: GOOGLE_PROVIDER_ID,
              googleAuth: firebaseAuth,
            };
            return instance;
          });
      })
      .catch(function (err) {
        loading = null; // let a later call retry
        console.error('Naseej: Firebase failed to load (' + err.message + ').');
        return fail('Firebase failed to load: ' + err.message);
      });

    return loading;
  }

  /* Marker written before a redirect sign-in and consumed on the way back. */
  const REDIRECT_KEY = 'naseej.auth.redirect';

  /* ── Redirect result ─────────────────────────────────────────────────────────
     A redirect sign-in navigates away from the page and returns to it, so the
     promise has to be resumed on the next page load. Resolving it here (as
     part of ready()) is what stops a returning visitor being stuck on the
     loading state: the caller awaits ready(), and ready() does not resolve
     until the redirect result has been consumed. */
  function consumeRedirect(bundle) {
    if (sessionStorage.getItem(REDIRECT_KEY)) {
      sessionStorage.removeItem(REDIRECT_KEY);
      return bundle.googleAuth
        .getRedirectResult(bundle.auth)
        .then(function () {
          return null;
        })
        .catch(function (err) {
          /* The user closed the Google page, or the request expired. Neither
             is a hard failure — auth state will simply resolve to signed out. */
          if (err && err.code === 'auth/user-cancelled') return null;
          console.warn('Naseej: sign-in redirect did not complete (' + (err && err.message) + ').');
          return null;
        });
    }
    return Promise.resolve(null);
  }

  NASEEJ.services = {
    isEnabled: function () {
      return ENABLED;
    },

    /* Resolves to { app, auth, ... } or { enabled:false, reason }. Never rejects. */
    ready: function () {
      return load().then(function (bundle) {
        if (!bundle || !bundle.enabled) return bundle;
        return consumeRedirect(bundle).then(function () {
          return bundle;
        });
      });
    },

    /* Synchronous peek, for code that only needs to branch. Returns null until
       ready() has resolved. */
    current: function () {
      return instance;
    },

    /* Google sign-in. Resolves to { status } once the user is authenticated;
       on the redirect path it resolves only after the round trip completes,
       because getRedirectResult is drained by ready(). */
    signInWithGoogle: function () {
      /* Ask the endpoint whether the provider is configured before opening a
         popup. If it is not, report that directly: a popup that opens and then
         dies with "Error" is a worse experience than an honest message. */
      return probeProvider().then(function (reason) {
        if (reason === 'CONFIGURATION_NOT_FOUND') {
          const err = new Error('CONFIGURATION_NOT_FOUND');
          err.code = 'auth/operation-not-allowed';
          throw err;
        }
        return load();
      })
        .then(function (bundle) {
          if (!bundle || !bundle.enabled) {
            const err = new Error(bundle && bundle.reason ? bundle.reason : 'Firebase is unavailable.');
            err.code = 'auth/unavailable';
            throw err;
          }
          bundle.provider.setCustomParameters({ prompt: 'select_account' });

          if (prefersRedirect()) {
            sessionStorage.setItem(REDIRECT_KEY, '1');
            return bundle.googleAuth
              .signInWithRedirect(bundle.auth, bundle.provider)
              .catch(function (err) {
                sessionStorage.removeItem(REDIRECT_KEY);
                throw err;
              });
          }

          return bundle.googleAuth.signInWithPopup(bundle.auth, bundle.provider).catch(function (err) {
            /* Popup blocked (some desktop privacy settings): retry once via
               the redirect flow rather than dead-ending on an error. */
            if (err && err.code === 'auth/popup-blocked') {
              sessionStorage.setItem(REDIRECT_KEY, '1');
              return bundle.googleAuth.signInWithRedirect(bundle.auth, bundle.provider);
            }
            throw err;
          });
        })
        .then(function (result) {
          return { status: 'success', user: result && result.user };
        })
        .catch(function (err) {
          /* A cancelled popup is a normal outcome, not a failure to shout about. */
          const quiet = err && (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/user-cancelled');
          if (!quiet) console.error('Naseej: sign-in failed (' + describe(err) + ')');
          return { status: 'error', code: (err && err.code) || 'auth/unknown', message: describe(err) };
        });
    },

    signOut: function () {
      return load().then(function (bundle) {
        if (!bundle || !bundle.enabled) return fail('Firebase is unavailable.');
        return bundle.googleAuth
          .signOut(bundle.auth)
          .then(function () {
            return { status: 'success' };
          })
          .catch(function (err) {
            return { status: 'error', message: describe(err) };
          });
      });
    },

    /* Subscribe to the signed-in user. `cb` is called immediately with the
       current user (null when signed out) and again on every change. Returns
       an unsubscribe function so the caller never leaks a listener. */
    onAuthStateChanged: function (cb) {
      let cancelled = false;
      let unsubscribe = null;

      load().then(function (bundle) {
        if (cancelled) return;
        if (!bundle || !bundle.enabled) {
          cb(null, fail(bundle && bundle.reason ? bundle.reason : 'Firebase is unavailable.'));
          return;
        }
        unsubscribe = bundle.googleAuth.onAuthStateChanged(bundle.auth, function (user) {
          cb(user, null);
        });
      });

      return function () {
        cancelled = true;
        if (unsubscribe) unsubscribe();
      };
    },

    /* Exposed so the UI can reuse the human-readable mapping. */
    describeError: describe,
  };
})(window.NASEEJ || (window.NASEEJ = {}));
