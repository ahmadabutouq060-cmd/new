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
 * Auth loads firebase-app.js and firebase-auth.js. Firestore is loaded only
 * after a weaver is signed in, to read/write that weaver's documents. KHAYT
 * does not call ai(): it is the local scripted companion in data.js. Analytics
 * is not loaded.
 *
 * There is exactly ONE Firebase app initialisation, here. No other file calls
 * initializeApp(); js/auth.js drives this module through NASEEJ.services.
 *
 * Public surface (all of it on NASEEJ.services):
 *   isEnabled()          -> boolean
 *   ready()              -> Promise<{ app, auth, ... } | { enabled:false, reason }>
 *   current()            -> the resolved bundle, or null
 *   signInWithGoogle()   -> Promise<{ status }>  (popup on desktop, redirect on mobile)
 *   signOut()            -> Promise<void>
 *   onAuthStateChanged() -> unsubscribe fn; fires immediately with the current user
 *   describeError(err)   -> a sentence a visitor can act on
 *
 * Persistence surface — the weaver's own documents, and nothing else. Every
 * function resolves to a plain result object and NEVER rejects, because a
 * Firebase failure must never be able to take the site down with it:
 *   loadUserProfile(uid)          -> { status, profile }
 *   saveUserProfile(uid, data)    -> { status, message? }
 *   loadUserProgress(uid)         -> { status, bundle }   (all five collections)
 *   awardAthar(uid, reward)       -> { status, awarded }  (idempotent)
 *   completeWaypoint(uid, row)    -> { status }
 *   completeChallenge(uid, row)   -> { status }
 *   saveMysteryState(uid, id, st) -> { status }
 *   saveSecretCompletion(uid, id, d) -> { status }
 *   syncAccount(uid, bundle)      -> { status, granted, error? }
 *   onPersistenceStatus(cb)       -> unsubscribe fn
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

    /* Firestore. "unavailable" is almost always the network rather than the
       write, so it says the progress is safe rather than implying it was lost. */
    'permission-denied': 'Your Naseej account could not be updated. Sign out and in again, then retry.',
    unavailable: 'You appear to be offline. Your progress is saved here and will reach Naseej when the connection returns.',
    'deadline-exceeded': 'Naseej took too long to respond. Your progress is safe — try again in a moment.',
    'not-found': 'Your Naseej account was not found. Sign out and in again to recreate it.',
    'unauthenticated': 'Your session has expired. Sign in again to keep your progress.',
    'resource-exhausted': 'Too many requests right now. Your progress is safe — try again shortly.',
    'failed-precondition': 'Naseej could not accept that change. Try again in a moment.',
    aborted: 'Two devices changed your journey at the same time. Your latest progress is kept.',
  };

  /* Codes worth retrying rather than surfacing. With the offline cache enabled
     most of these never reach the caller at all — the write is queued locally
     and applied when the connection returns — but the SDK still surfaces some
     of them, and a retry costs nothing. */
  const RETRY_CODES = ['unavailable', 'deadline-exceeded', 'internal', 'aborted', 'resource-exhausted'];

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

  /* Firestore rejects `undefined`. Walk the snapshot so a missing optional
     field becomes an omitted key rather than a failed write. */
  function forFirestore(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (Array.isArray(value)) {
      const list = [];
      for (let i = 0; i < value.length; i++) {
        const item = forFirestore(value[i]);
        if (item !== undefined) list.push(item);
      }
      return list;
    }
    if (typeof value === 'object') {
      const out = {};
      for (const key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
        const item = forFirestore(value[key]);
        if (item !== undefined) out[key] = item;
      }
      return out;
    }
    if (typeof value === 'number' && !isFinite(value)) return null;
    return value;
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

        const app = firebaseApp.getApps && firebaseApp.getApps().length
          ? firebaseApp.getApp()
          : firebaseApp.initializeApp(config);
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

  /* ── Firestore handle ───────────────────────────────────────────────────────
     Lazy, because a visitor who never touches Sign In must never download the
     Firestore SDK. When it is first needed it is initialised with a persistent
     local cache, so a write made on a train is queued on the device and applied
     when the connection returns rather than being lost — which is what lets the
     UI promise "your progress is safe" honestly. */
  function db_() {
    return load().then(function (bundle) {
      if (!bundle || !bundle.enabled) {
        return fail((bundle && bundle.reason) || 'Firebase is unavailable.');
      }
      if (bundle.db && bundle.firestore) return bundle;
      return import(SDK + 'firebase-firestore.js')
        .then(function (fs) {
          bundle.firestore = fs;
          /* initializeFirestore throws if the instance already exists, and a
             browser that refuses IndexedDB throws too; in both cases the plain
             in-memory Firestore is a working fallback, so neither is fatal. */
          const options = fs.persistentLocalCache && fs.persistentMultipleTabManager
            ? { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }
            : undefined;
          try {
            bundle.db = options ? fs.initializeFirestore(bundle.app, options) : fs.getFirestore(bundle.app);
          } catch (err) {
            console.warn('Naseej: Firestore offline cache unavailable (' + (err && err.message) + '); using memory.');
            bundle.db = fs.getFirestore(bundle.app);
          }
          watchConnection(fs, bundle);
          return bundle;
        })
        .catch(function (err) {
          console.warn('Naseej: Firestore SDK failed to load (' + (err && err.message) + ').');
          return fail('Firestore is unavailable: ' + (err && err.message));
        });
    });
  }

  /* ── Status channel ─────────────────────────────────────────────────────────
     One place the persistence layer reports what it is doing, so auth.js can
     surface a failure with the words the rest of the app already uses instead
     of every caller inventing its own message. */
  const statusListeners = [];
  let persistenceState = { state: 'idle', message: '' };

  function emit(state, message) {
    /* The same message twice is noise, not information: the sync writer fires
       on every progress change, and a weaver should not be told the same
       sentence five times while they answer a challenge. */
    if (persistenceState.state === state && persistenceState.message === (message || '')) return;
    persistenceState = { state: state, message: message || '' };
    for (let i = 0; i < statusListeners.length; i++) {
      try { statusListeners[i](persistenceState); } catch (err) { /* a listener cannot break persistence */ }
    }
  }

  /* The browser's own connectivity, not Firestore's, because the question the
     visitor needs answered is "is my network up", and navigator.onLine is the
     only thing that answers it without a round trip. */
  let connectionWatched = false;
  function watchConnection(fs, bundle) {
    if (connectionWatched || typeof window.addEventListener !== 'function') return;
    connectionWatched = true;
    const set = function () {
      const online = navigator.onLine !== false;
      if (!online) emit('offline', 'You are offline. Progress is saved on this device and will sync when you reconnect.');
      else if (persistenceState.state === 'offline') emit('idle', '');
    };
    window.addEventListener('online', set);
    window.addEventListener('offline', set);
    set();
    /* The SDK's own connectivity signal, which also fires on a Firestore-side
       outage the browser knows nothing about. */
    if (fs && typeof fs.onSnapshotsInSync === 'function') {
      try { fs.onSnapshotsInSync(bundle.db, function () { set(); }); } catch (err) { /* not fatal */ }
    }
  }

  /* ── Write helpers ──────────────────────────────────────────────────────────
     Nothing in this file rejects. Every operation comes back as { status }, so
     a Firestore outage degrades to "this did not save" instead of an
     unhandled rejection in the middle of a challenge. */
  function isRetryable(err) {
    return !!(err && RETRY_CODES.indexOf(err.code) >= 0);
  }

  function withRetry(attempt) {
    return attempt(0).catch(function (err) {
      if (!isRetryable(err) || attempt.retries >= 2) throw err;
      attempt.retries += 1;
      const wait = attempt.retries * 400;
      return new Promise(function (resolve) { setTimeout(resolve, wait); }).then(function () {
        return attempt(attempt.retries);
      });
    });
  }

  /* Anything that could not be retried is reported once, in the visitor's
     language, and the local document is still the record of truth — so the app
     keeps working exactly as it did before Firebase was involved. */
  function failed(err, what) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const message = offline
      ? 'You appear to be offline. Your progress is saved on this device and will sync when you reconnect.'
      : describe(err);
    emit('error', message);
    console.warn('Naseej: ' + what + ' did not save (' + (err && err.message ? err.message : err) + ').');
    return { status: 'error', message: message, code: (err && err.code) || 'unknown' };
  }

  /* `users/{uid}` and the five subcollections. One helper so a path can never
     be assembled two slightly different ways in two places. */
  function userRef(bundle, uid) {
    return bundle.firestore.doc(bundle.db, 'users', String(uid));
  }
  function subRef(bundle, uid, name, id) {
    return bundle.firestore.doc(bundle.db, 'users', String(uid), name, String(id));
  }
  function subCollection(bundle, uid, name) {
    return bundle.firestore.collection(bundle.db, 'users', String(uid), name);
  }

  function now() {
    return Date.now();
  }

  /* ── Reads ──────────────────────────────────────────────────────────────────
     One read of all five collections, because the caller needs all of them to
     rebuild a session and five round trips would make the first paint after a
     refresh visibly wait for the last one. */

  function loadUserProfile(uid) {
    if (!uid) return Promise.resolve({ status: 'error', profile: null });
    return db_().then(function (bundle) {
      if (!bundle || !bundle.enabled || !bundle.db) return { status: 'error', profile: null };
      return withRetry(function () {
        return bundle.firestore.getDoc(userRef(bundle, uid));
      }).then(function (snap) {
        return { status: 'success', profile: snap.exists() ? snap.data() : null };
      }).catch(function (err) {
        return Object.assign(failed(err, 'Your profile'), { profile: null });
      });
    });
  }

  /* Identity and the two counters. `athar` and `atharBase` are written here and
     nowhere else in this file: every reward goes through awardAthar(), which is
     the only path that may raise the total. */
  function saveUserProfile(uid, data) {
    if (!uid || !data) return Promise.resolve({ status: 'error', message: 'Missing weaver.' });
    return db_().then(function (bundle) {
      if (!bundle || !bundle.enabled || !bundle.db) {
        return { status: 'error', message: (bundle && bundle.reason) || 'Firestore is unavailable.' };
      }
      const payload = forFirestore({
        displayName: data.displayName || '',
        email: data.email || '',
        photoURL: data.photoURL || '',
        memberSince: data.memberSince || null,
        verified: !!data.verified,
        badges: Array.isArray(data.badges) ? data.badges : [],
        wishlist: data.wishlist && typeof data.wishlist === 'object' ? data.wishlist : {},
        redemptions: data.redemptions && typeof data.redemptions === 'object' ? data.redemptions : {},
        /* `atharBase` is the balance a weaver held before this build existed, and
           it only ever grows. Coercing a missing one to 0 would be a *decrease* on
           any account that already has one, and the rules reject that — taking the
           identity fields in the same merge down with it. So a caller with nothing
           to say about the base omits the key instead. */
        atharBase: isCount(data.atharBase) ? data.atharBase : null,
        updatedAt: now(),
      });
      if (!isCount(data.atharBase)) delete payload.atharBase;
      return withRetry(function () {
        return bundle.firestore.setDoc(userRef(bundle, uid), payload, { merge: true });
      }).then(function () {
        return { status: 'success' };
      }).catch(function (err) {
        return failed(err, 'Your profile');
      });
    });
  }

  function isCount(v) {
    return typeof v === 'number' && isFinite(v) && v >= 0;
  }

  /* progress / rewards / mysteries / secrets, in one pass. Missing collections
     come back as empty arrays rather than null, so the caller never has to ask
     which shape it got. */
  function loadUserProgress(uid) {
    if (!uid) return Promise.resolve({ status: 'error', bundle: null });
    return db_().then(function (bundle) {
      if (!bundle || !bundle.enabled || !bundle.db) return { status: 'error', bundle: null };

      const names = ['progress', 'rewards', 'mysteries', 'secrets'];
      const reads = names.map(function (name) {
        return withRetry(function () {
          return bundle.firestore.getDocs(subCollection(bundle, uid, name));
        }).then(function (snap) {
          return snap.docs.map(function (d) {
            const out = d.data() || {};
            /* The document id IS the unique key. Carrying it into the row means
               data.js can refuse a document whose contents disagree with its own
               path — see applyAccountBundle's mergeRewards. */
            out.id = d.id;
            return out;
          });
        });
      });

      return Promise.all([
        withRetry(function () { return bundle.firestore.getDoc(userRef(bundle, uid)); })
          .then(function (snap) { return snap.exists() ? snap.data() : null; }),
      ].concat(reads)).then(function (results) {
          const profile = results[0];
          return {
            status: 'success',
            bundle: {
              profile: profile,
              atharBase: profile && isCount(profile.atharBase) ? profile.atharBase : 0,
              athar: profile && isCount(profile.athar) ? profile.athar : 0,
              atharPeak: profile && isCount(profile.atharPeak) ? profile.atharPeak : 0,
              redemptions: (profile && profile.redemptions) || {},
              wishlist: (profile && profile.wishlist) || {},
              badges: (profile && profile.badges) || [],
              progress: results[1],
              rewards: results[2],
              mysteries: results[3],
              secrets: results[4],
              /* Nothing at all under this uid: the caller creates it from local
                 progress rather than treating an empty account as authoritative. */
              exists: !!profile || results.slice(1).some(function (rows) { return rows.length > 0; }),
            },
          };
        })
        .catch(function (err) {
          return Object.assign(failed(err, 'Your journey'), { bundle: null });
        });
    });
  }

  /* ── The reward ledger ──────────────────────────────────────────────────────
     `uniqueKey` is the document id, so this write is idempotent by construction.
     The transaction reads before it writes so two devices solving the same
     challenge at the same moment cannot both pay: the loser's read sees the
     winner's document and returns { status: 'duplicate' }. */
  function awardAthar(uid, reward) {
    if (!uid || !reward || !reward.uniqueKey) {
      return Promise.resolve({ status: 'error', message: 'Nothing to award.' });
    }
    return db_().then(function (bundle) {
      if (!bundle || !bundle.enabled || !bundle.db) {
        return { status: 'error', message: (bundle && bundle.reason) || 'Firestore is unavailable.' };
      }
      const key = String(reward.uniqueKey);
      const doc = forFirestore({
        uniqueKey: key,
        entryKey: String(reward.entryKey || key),
        type: String(reward.type || ''),
        source: String(reward.source || ''),
        threadId: reward.threadId == null ? null : reward.threadId,
        waypointId: reward.waypointId == null ? null : reward.waypointId,
        challengeId: reward.challengeId == null ? null : String(reward.challengeId),
        clueId: reward.clueId == null ? null : reward.clueId,
        chapterKey: reward.chapterKey == null ? null : String(reward.chapterKey),
        secretId: reward.secretId == null ? null : String(reward.secretId),
        amount: reward.amount,
        earnedAt: now(),
      });

      return withRetry(function () {
        return bundle.firestore.runTransaction(bundle.db, function (tx) {
          const rewardPath = subRef(bundle, uid, 'rewards', key);
          return tx.get(rewardPath).then(function (snap) {
            if (snap.exists()) return { granted: false, reason: 'already' };
            const profilePath = userRef(bundle, uid);
            return tx.get(profilePath).then(function (snap2) {
              const current = (snap2.exists() && snap2.data()) || {};
              /* Never lower it: a stale cache on a second device must not be able
                 to reduce a total this account has already earned. */
              const before = isCount(current.athar) ? current.athar : 0;
              const peak = isCount(current.atharPeak) ? current.atharPeak : 0;
              const after = before + (isCount(doc.amount) ? doc.amount : 0);
              tx.set(rewardPath, doc);
              tx.set(profilePath, { athar: after, atharPeak: Math.max(peak, after), updatedAt: now() }, { merge: true });
              return { granted: true, amount: doc.amount, athar: after };
            });
          });
        });
      }).then(function (result) {
        return result.granted
          ? { status: 'success', awarded: true, amount: result.amount, athar: result.athar }
          : { status: 'success', awarded: false, reason: result.reason };
      }).catch(function (err) {
        return failed(err, 'A reward');
      });
    });
  }

  /* ── Progress ───────────────────────────────────────────────────────────────
     setDoc with merge, so the row is created once and refreshed afterwards. A
     `completed: false` row is never written: progress only ever moves forward,
     and a document that un-completes a waypoint would be a way to farm it. */
  function writeProgressRow(bundle, uid, row) {
    if (!row || !row.threadId || row.completed !== true) {
      return Promise.resolve({ status: 'success', skipped: true });
    }
    const id = String(row.id);
    return withRetry(function () {
      return bundle.firestore.setDoc(subRef(bundle, uid, 'progress', id), forFirestore({
        threadId: row.threadId,
        waypointId: row.waypointId == null ? null : row.waypointId,
        completed: true,
        completedAt: isCount(row.completedAt) ? row.completedAt : now(),
        metadata: forFirestore(row.metadata || {}),
        updatedAt: now(),
      }), { merge: true });
    }).then(function () {
      return { status: 'success' };
    }).catch(function (err) {
      return failed(err, 'A waypoint');
    });
  }

  function completeWaypoint(uid, row) {
    if (!uid) return Promise.resolve({ status: 'error', message: 'No weaver.' });
    return db_().then(function (bundle) {
      if (!bundle || !bundle.enabled || !bundle.db) return { status: 'error', message: 'Firestore is unavailable.' };
      return writeProgressRow(bundle, uid, row);
    });
  }

  /* A challenge completion is a progress row *and* its reward, and the reward
     is the part that has to be idempotent, so this is the same two calls a
     caller would make by hand — named, because "answer the challenge and save
     both things" is the whole operation. */
  function completeChallenge(uid, row) {
    if (!uid) return Promise.resolve({ status: 'error', message: 'No weaver.' });
    return db_().then(function (bundle) {
      if (!bundle || !bundle.enabled || !bundle.db) return { status: 'error', message: 'Firestore is unavailable.' };
      return writeProgressRow(bundle, uid, row).then(function (result) {
        if (!row || !row.reward) return result;
        return awardAthar(uid, row.reward);
      });
    });
  }

  function saveMysteryState(uid, mysteryId, state) {
    if (!uid || !mysteryId) return Promise.resolve({ status: 'error', message: 'No weaver.' });
    return db_().then(function (bundle) {
      if (!bundle || !bundle.enabled || !bundle.db) return { status: 'error', message: 'Firestore is unavailable.' };
      return withRetry(function () {
        return bundle.firestore.setDoc(subRef(bundle, uid, 'mysteries', mysteryId), forFirestore({
          threadId: state.threadId,
          choices: forFirestore(state.choices || {}),
          currentChapter: state.currentChapter || null,
          clues: Array.isArray(state.clues) ? state.clues : [],
          completed: Array.isArray(state.completed) ? state.completed : [],
          progressPercent: isCount(state.progressPercent) ? state.progressPercent : 0,
          athar: isCount(state.athar) ? state.athar : 0,
          /* `reveal` is written for the reader's convenience but never believed
             on the way in: data.js recomputes it from the state above, so a
             hand-written document cannot unlock the ending. */
          reveal: !!state.reveal,
          updatedAt: now(),
        }), { merge: true });
      }).then(function () {
        return { status: 'success' };
      }).catch(function (err) {
        return failed(err, 'A mystery');
      });
    });
  }

  function saveSecretCompletion(uid, secretId, data) {
    if (!uid || !secretId) return Promise.resolve({ status: 'error', message: 'No weaver.' });
    return db_().then(function (bundle) {
      if (!bundle || !bundle.enabled || !bundle.db) return { status: 'error', message: 'Firestore is unavailable.' };
      /* Create-only once completed, matching the rules: a secret that has been
         found cannot be un-found by writing over it. */
      return withRetry(function () {
        return bundle.firestore.setDoc(subRef(bundle, uid, 'secrets', secretId), forFirestore({
          threadId: data.threadId,
          completed: !!data.completed,
          rewardGranted: !!data.rewardGranted,
          optionId: data.optionId == null ? null : String(data.optionId),
          completedAt: data.completedAt == null ? null : data.completedAt,
          updatedAt: now(),
        }), { merge: true });
      }).then(function () {
        return { status: 'success' };
      }).catch(function (err) {
        return failed(err, 'A secret');
      });
    });
  }

  /* ── The one call the writer makes ──────────────────────────────────────────
     syncAccount() is the whole persistence surface in practice: it awards
     whatever is missing from the ledger, writes the progress rows, the mystery
     and secret documents, and the profile — and it is safe to call as often as
     the app likes, because every part of it is a merge or an idempotent
     transaction. That matters: this runs on every progress change, so "call it
     again" has to be free rather than something to be careful about.

     Rewards are read first so only the genuinely missing ones cost a
     transaction. A weaver who has already earned everything pays for one empty
     read, not thirteen transactions, on every keystroke-triggered save. */
  function syncAccount(uid, bundle) {
    if (!uid || !bundle) return Promise.resolve({ status: 'error', message: 'No weaver.' });
    return db_().then(function (bundleRef) {
      if (!bundleRef || !bundleRef.enabled || !bundleRef.db) {
        return { status: 'error', message: (bundleRef && bundleRef.reason) || 'Firestore is unavailable.' };
      }
      emit('saving', '');

      const fs = bundleRef.firestore;

/* `athar` is the total ever earned: the base plus the ledger, *not* plus
         what has been spent. Redeeming a reward moves ATHAR out of the held
         balance and into the spent column; it does not earn anything. Adding
         `spentAthar` here inflated the total by every redemption the account had
         ever made, and because the total is monotonic that error would then be
         carried forward into every future save. This is the same figure data.js
         puts in accountBundle().athar. */
      const earned = isCount(bundle.atharBase) && isCount(bundle.ledgerAthar)
        ? bundle.atharBase + bundle.ledgerAthar
        : null;

      /* One document write, not two. The identity merge and the total used to be
         two concurrent setDoc calls against the same path, which race: whichever
         landed first produced a request.resource.data missing the other's keys,
         and the security rules check the *merged* document. One write is both
         cheaper and the only way the field rules ever see a whole document. */
      const profile = forFirestore({
        displayName: (bundle.profile && bundle.profile.displayName) || '',
        email: (bundle.profile && bundle.profile.email) || '',
        photoURL: (bundle.profile && bundle.profile.photoURL) || '',
        memberSince: (bundle.profile && bundle.profile.memberSince) || null,
        verified: !!(bundle.profile && bundle.profile.verified),
        badges: Array.isArray(bundle.badges) ? bundle.badges : [],
        wishlist: bundle.wishlist || {},
        redemptions: bundle.redemptions || {},
        atharBase: isCount(bundle.atharBase) ? bundle.atharBase : 0,
        athar: isCount(earned) ? earned : null,
        atharPeak: Math.max(
          isCount(bundle.atharPeak) ? bundle.atharPeak : 0,
          isCount(earned) ? earned : 0
        ),
        updatedAt: now(),
      });
      /* Omitted rather than nulled when the caller could not produce a
         trustworthy total: a null would fail the rules' count check and take
         every other field in this same merge down with it. */
      if (!isCount(earned)) delete profile.athar;

      return withRetry(function () {
        return fs.getDocs(subCollection(bundleRef, uid, 'rewards'));
      }).then(function (snap) {
        const held = {};
        snap.docs.forEach(function (d) { held[d.id] = true; });
        const missing = [];
        for (let i = 0; i < (bundle.rewards || []).length; i++) {
          const row = bundle.rewards[i];
          if (!row || !row.uniqueKey || held[row.uniqueKey]) continue;
          held[row.uniqueKey] = true; // two identical rows in one bundle
          missing.push(row);
        }

        /* Rewards first: the balance is only correct once they are in, and the
           profile's athar is recomputed from them afterwards. */
        return missing.reduce(function (chain, row) {
          return chain.then(function () { return awardAthar(uid, row); });
        }, Promise.resolve()).then(function (grants) {
          const granted = grants.filter(function (g) { return g && g.awarded; });
          const errors = grants.filter(function (g) { return g && g.status === 'error'; });

          const writes = [bundleRef.firestore.setDoc(userRef(bundleRef, uid), profile, { merge: true })];
          for (let i = 0; i < (bundle.progress || []).length; i++) {
            writes.push(writeProgressRow(bundleRef, uid, bundle.progress[i]));
          }
          for (let i = 0; i < (bundle.mysteries || []).length; i++) {
            const m = bundle.mysteries[i];
            writes.push(saveMysteryState(uid, m.id, m));
          }
          for (let i = 0; i < (bundle.secrets || []).length; i++) {
            const s = bundle.secrets[i];
            writes.push(saveSecretCompletion(uid, s.id, s));
          }

          return Promise.all(writes).then(function () {
            if (errors.length) {
              return { status: 'error', granted: granted.length, message: errors[0].message };
            }
            emit('saved', '');
            return { status: 'success', granted: granted.length };
          });
        });
      }).catch(function (err) {
        return failed(err, 'Your progress');
      });
    });
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

    /* ── Persistence ─────────────────────────────────────────────────────────
       Every path below is `users/{uid}` and its subcollections. Nothing here can
       reach another weaver's documents: the path is built from the uid auth.js
       hands over, and firestore.rules refuses anything else.

       The two ideas that make a reward safe:

         1. A reward document's ID *is* its unique key (t{thread}_{kind}_{what}),
            derived from the (thread, waypoint, challenge) triple. Creating it
            twice is the same document, so a refresh, a double tap and a second
            device all collide on one write instead of producing three payouts.
         2. awardAthar() runs in a transaction that reads the ledger before it
            writes, so a concurrent grant of the same reward loses rather than
            double-paying even before the rules see it.

       The security rules make rewards create-only, which closes the other
       direction: a granted reward cannot be edited into a bigger one. */

    /* Resolves to { enabled, app, db, firestore } or { enabled:false, reason }. */
    firestore: db_,

    /* The one place the persistence status is published. auth.js subscribes so
       a failed save can say so in the words the rest of the app already has. */
    onPersistenceStatus: function (cb) {
      statusListeners.push(cb);
      return function () {
        const at = statusListeners.indexOf(cb);
        if (at >= 0) statusListeners.splice(at, 1);
      };
    },

    persistenceStatus: function () {
      return persistenceState;
    },

    loadUserProfile: loadUserProfile,
    saveUserProfile: saveUserProfile,
    loadUserProgress: loadUserProgress,

    awardAthar: awardAthar,
    completeWaypoint: completeWaypoint,
    completeChallenge: completeChallenge,
    saveMysteryState: saveMysteryState,
    saveSecretCompletion: saveSecretCompletion,
    syncAccount: syncAccount,

    /* ── Legacy ──────────────────────────────────────────────────────────────
       An earlier build stored the whole progress snapshot in one `weavers/{uid}`
       document. It is still read — exactly once, on the first sign-in of an
       account that has no `users/{uid}` document — so a weaver who already
       uploaded progress does not lose it. It is never written again. */
    loadWeaver: function (uid) {
      if (!uid) return Promise.resolve(null);
      return db_().then(function (bundle) {
        if (!bundle || !bundle.enabled || !bundle.db) return null;
        const ref = bundle.firestore.doc(bundle.db, 'weavers', String(uid));
        return bundle.firestore.getDoc(ref).then(function (snap) {
          return snap.exists() ? snap.data() : null;
        }).catch(function (err) {
          /* A rules denial here is expected for anyone who never had a legacy
             document written under the old rules, and must not be reported as
             a failure of the new model. */
          if (!err || err.code !== 'permission-denied') {
            console.warn('Naseej: could not read the legacy weaver document (' + (err && err.message) + ').');
          }
          return null;
        });
      });
    },

    /* Optional Firebase AI Logic / Gemini. Same app. Unused by the product:
       KHAYT is the local scripted companion in data.js and does not call this. */
    ai: function () {
      return load().then(function (bundle) {
        if (!bundle || !bundle.enabled) {
          return fail((bundle && bundle.reason) || 'Firebase is unavailable.');
        }
        if (bundle.aiModel) return bundle;
        return import(SDK + 'firebase-ai.js')
          .then(function (aiMod) {
            if (!aiMod || typeof aiMod.getAI !== 'function') {
              return fail('Firebase AI Logic is not available in this SDK build.');
            }
            const opts = aiMod.GoogleAIBackend
              ? { backend: new aiMod.GoogleAIBackend() }
              : undefined;
            const ai = opts ? aiMod.getAI(bundle.app, opts) : aiMod.getAI(bundle.app);
            bundle.ai = ai;
            bundle.aiMod = aiMod;
            bundle.aiModel = aiMod.getGenerativeModel(ai, { model: 'gemini-2.0-flash' });
            bundle.aiLive = true;
            return bundle;
          })
          .catch(function (err) {
            console.warn('Naseej: Firebase AI SDK failed to load (' + (err && err.message) + ').');
            return fail('Firebase AI Logic is not configured: ' + (err && err.message));
          });
      });
    },
  };
})(window.NASEEJ || (window.NASEEJ = {}));
