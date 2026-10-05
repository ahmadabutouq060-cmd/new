// Naseej - Cloud Functions (trusted server-side logic)
const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const { ATHAR, REWARD_SOURCES, docSafe, rewardKey } = require('./lib/schema');
const { validateChallenge } = require('./lib/validation');
const { validateSecret } = require('./lib/secrets');
const { isValidThread, isValidWaypoint, isValidBranch, allowedBranches } = require('./lib/product');

function nowMillis() {
  return Date.now();
}

function isWhole(n) {
  return typeof n === 'number' && Number.isFinite(n) && Math.floor(n) === n;
}

function isCount(n) {
  return isWhole(n) && n >= 0;
}

function rewardAmountFor(type) {
  if (type === 'challenge' || type === 'observation') return ATHAR.challenge;
  if (ATHAR[type] != null) return ATHAR[type];
  return -1;
}

function rewardSourceFor(type) {
  if (type === 'challenge') return REWARD_SOURCES.challenge;
  if (REWARD_SOURCES[type]) return REWARD_SOURCES[type];
  return '';
}

function buildRewardDoc({ threadId, kind, key, challengeId, clueId, chapterKey, secretId }) {
  const k = kind === 'observation' ? 'challenge' : kind;
  const amount = rewardAmountFor(k);
  if (amount < 0) return null;
  const src = rewardSourceFor(k) || (k === 'challenge' ? 'challenge_answer' : '');
  const uniqueKey = rewardKey(threadId, k, key);
  const entryKey = k + ':' + key;
  const doc = {
    uniqueKey,
    entryKey,
    type: k,
    source: src,
    threadId: Number(threadId),
    waypointId: null,
    challengeId: challengeId || null,
    clueId: clueId == null ? null : Number(clueId),
    chapterKey: chapterKey == null ? null : String(chapterKey),
    secretId: secretId == null ? null : String(secretId),
    amount,
    earnedAt: nowMillis(),
  };
  if (k === 'challenge') {
    const wp = Number(key);
    if (!isWhole(wp) || wp <= 0) return null;
    doc.waypointId = wp;
    doc.challengeId = challengeId || ('t' + threadId + '_w' + wp);
  } else if (k === 'clue') {
    if (!isWhole(Number(key))) return null;
    doc.clueId = Number(key);
  } else if (k === 'chapter') {
    doc.chapterKey = String(key);
  } else if (k === 'reveal') {
    doc.challengeId = 't' + threadId + '_final';
  } else if (k === 'secret') {
    doc.secretId = String(key);
  }
  return doc;
}

function requireAuth(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  return context.auth.uid;
}

exports.completeChallenge = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const threadId = Number(data.threadId);
  const waypointId = Number(data.waypointId);
  const challengeId = data.challengeId == null ? null : String(data.challengeId);
  /* js/data.js sends `optionId` — the id of the option the weaver tapped — and
     completeSecret below already accepts `optionId`. Reading `data.answer`
     alone meant every call arrived with answer === undefined and was denied as
     `invalid_answer`, so no challenge reward was ever granted. Accept both. */
  const answer = data.optionId != null ? data.optionId : data.answer;

  const v = validateChallenge({ threadId, waypointId, challengeId, answer });
  if (!v.ok) {
    return { status: 'denied', reason: v.reason };
  }

  const rewardKeyPart = String(waypointId);
  const rewardDoc = buildRewardDoc({ threadId, kind: 'challenge', key: rewardKeyPart, challengeId });
  if (!rewardDoc) return { status: 'error', reason: 'invalid_reward' };

  const uniqueKey = rewardDoc.uniqueKey;
  const userRef = db.collection('users').doc(uid);
  const rewardRef = userRef.collection('rewards').doc(uniqueKey);

  try {
    const result = await db.runTransaction(async (tx) => {
      const rewardSnap = await tx.get(rewardRef);
      if (rewardSnap.exists) {
        return { granted: false, reason: 'already' };
      }
      const profileSnap = await tx.get(userRef);
      const current = profileSnap.exists ? profileSnap.data() : {};
      const before = isCount(current.athar) ? current.athar : 0;
      const peak = isCount(current.atharPeak) ? current.atharPeak : 0;
      const amount = rewardDoc.amount;
      const after = before + (isCount(amount) ? amount : 0);
      tx.set(rewardRef, rewardDoc);
      tx.set(userRef, {
        athar: after,
        atharPeak: Math.max(peak, after),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { granted: true, amount, athar: after };
    });

    if (!result.granted) {
      return { status: 'success', awarded: false, reason: result.reason };
    }
    return { status: 'success', awarded: true, amount: result.amount, athar: result.athar };
  } catch (err) {
    throw new functions.https.HttpsError('internal', err.message || 'Failed');
  }
});

exports.completeWaypoint = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const threadId = Number(data.threadId);
  /* Number(undefined) is NaN — coerce first, keep null for a thread-level row. */
  const waypointId = data.waypointId == null ? null : Number(data.waypointId);

  /* ── Authoritative validation ─────────────────────────────────────────────
     Reject unknown or malformed threadId / waypointId before touching
     Firestore.  The client cannot invent valid-looking IDs for non-existent
     threads or cross-thread waypoints.

     isValidWaypoint(threadId, null) is true — it signals a thread-level
     progress row (t{id}_progress), which completeWaypoint may write.
     isValidWaypoint(threadId, waypointId) requires waypointId to be a
     finite positive integer present in that exact thread's waypoint list. */
  if (!isValidThread(threadId)) {
    return { status: 'invalid_thread', reason: 'unknown_thread' };
  }
  if (!isValidWaypoint(threadId, waypointId)) {
    return { status: 'invalid_waypoint', reason: 'unknown_waypoint' };
  }

  /* The document id is the same one progressRows() in js/data.js produces, so
     the server writer and the client's row addressing name one document. */
  const progressId =
    waypointId == null
      ? 't' + threadId + '_progress'
      : 't' + threadId + '_w' + docSafe(waypointId);
  const progressRef = db.collection('users').doc(uid).collection('progress').doc(progressId);
  const existing = await progressRef.get();
  if (existing.exists) {
    return { status: 'success', awarded: false, reason: 'already' };
  }

  const progressData = {
    threadId,
    waypointId,
    completed: true,
    completedAt: nowMillis(),
    metadata: {},
    updatedAt: FieldValue.serverTimestamp(),
  };
  try {
    await progressRef.set(progressData);
    return { status: 'success', awarded: false };
  } catch (err) {
    throw new functions.https.HttpsError('internal', err.message || 'Failed');
  }
});

exports.completeSecret = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const threadId = Number(data.threadId);
  const secretId = data.secretId == null ? 'hidden-crack' : String(data.secretId);
  const optionId = data.optionId || data.answer;

  const v = validateSecret({ threadId, secretId, optionId });
  if (!v.ok) {
    return { status: 'denied', reason: v.reason };
  }

  const rewardDoc = buildRewardDoc({ threadId, kind: 'secret', key: secretId, secretId });
  if (!rewardDoc) return { status: 'error', reason: 'invalid_reward' };

  const uniqueKey = rewardDoc.uniqueKey;
  const userRef = db.collection('users').doc(uid);
  const rewardRef = userRef.collection('rewards').doc(uniqueKey);
  // Same key shape lib/secrets.js validates against: '<threadId>_<secretId>'.
  const secretRef = userRef.collection('secrets').doc(threadId + '_' + secretId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const rewardSnap = await tx.get(rewardRef);
      if (rewardSnap.exists) return { granted: false, reason: 'already' };
      const profileSnap = await tx.get(userRef);
      const current = profileSnap.exists ? profileSnap.data() : {};
      const before = isCount(current.athar) ? current.athar : 0;
      const peak = isCount(current.atharPeak) ? current.atharPeak : 0;
      const amount = rewardDoc.amount;
      const after = before + (isCount(amount) ? amount : 0);
      tx.set(rewardRef, rewardDoc);
      tx.set(userRef, {
        athar: after,
        atharPeak: Math.max(peak, after),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      tx.set(secretRef, {
        threadId,
        completed: true,
        rewardGranted: true,
        optionId: String(optionId),
        completedAt: nowMillis(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { granted: true, amount, athar: after };
    });

    if (!result.granted) {
      return { status: 'success', awarded: false, reason: result.reason };
    }
    return { status: 'success', awarded: true, amount: result.amount, athar: result.athar };
  } catch (err) {
    throw new functions.https.HttpsError('internal', err.message || 'Failed');
  }
});

exports.chooseMysteryBranch = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const threadId = Number(data.threadId);
  const branchId = typeof data.branchId === 'string' ? data.branchId.trim() : '';

  /* ── Authoritative validation ─────────────────────────────────────────────
     Only known threads may have a branch, and only declared branch ids are
     accepted.  A thread without branching simply has no entry in BRANCHES,
     so isValidBranch() returns false for every branchId there. */
  if (!isValidThread(threadId)) {
    return { status: 'error', reason: 'invalid_thread' };
  }
  const allowed = allowedBranches(threadId);
  if (!allowed) {
    return { status: 'error', reason: 'no_branches', message: 'This thread does not support branching.' };
  }
  if (!isValidBranch(threadId, branchId)) {
    return { status: 'error', reason: 'invalid_branch',
             allowed: allowed, received: branchId };
  }

  const mysteryRef = db.collection('users').doc(uid).collection('mysteries').doc(String(threadId));
  const snap = await mysteryRef.get();

  /* If a branch was already chosen for this thread, selecting the same branch
     again is idempotent.  Selecting a DIFFERENT branch is rejected — a choice
     cannot be revoked once recorded, because it may already have unlocked clues
     and generated rewards. */
  if (snap.exists) {
    const stored = snap.data();
    const existingBranch = (stored.choices && stored.choices.branch) || null;
    if (existingBranch && existingBranch !== branchId) {
      return { status: 'success', branch: existingBranch, changed: false,
               message: 'Branch already set; a choice cannot be changed.' };
    }
    if (existingBranch === branchId) {
      return { status: 'success', branch: branchId, changed: false };
    }
  }

  /* Write only client-owned mystery state — choices.branch, updatedAt.
     Do NOT accept athar, reveal, clues, completed, or progressPercent
     from the client.  Those are server-derived. */
  const existingClues     = (snap.exists && Array.isArray(snap.data().clues))     ? snap.data().clues     : [];
  const existingCompleted = (snap.exists && Array.isArray(snap.data().completed)) ? snap.data().completed : [];
  const existingAthar     = (snap.exists && isCount(snap.data().athar))           ? snap.data().athar     : 0;
  const existingPercent   = (snap.exists && isCount(snap.data().progressPercent)) ? snap.data().progressPercent : 0;
  const existingReveal    = (snap.exists && !!snap.data().reveal);
  const existingChapter   = (snap.exists && snap.data().currentChapter != null)
                              ? snap.data().currentChapter : null;

  try {
    await mysteryRef.set({
      threadId,
      choices: { branch: branchId },
      currentChapter: existingChapter,
      clues: existingClues,
      completed: existingCompleted,
      progressPercent: existingPercent,
      athar: existingAthar,
      reveal: existingReveal,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { status: 'success', branch: branchId, changed: true };
  } catch (err) {
    throw new functions.https.HttpsError('internal', err.message || 'Failed');
  }
});

exports.saveMysteryState = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const threadId = Number(data.threadId || data.id);
  const state = data.state || data || {};

  /* ── Validation ───────────────────────────────────────────────────────────
     saveMysteryState is the general-purpose mystery sync; it may only write
     client-owned story state (choices, chapter, clue list, completion list,
     progress percent).  Server-owned scored fields — athar, reveal — must
     never be accepted from the client here.  The Firestore rule enforces this
     at the database layer; this function enforces it at the application layer
     so the two are consistent.  chooseMysteryBranch is the authoritative path
     for the choices.branch field specifically. */
  if (!isValidThread(threadId)) {
    return { status: 'error', reason: 'invalid_thread' };
  }

  /* Read the existing athar and reveal so we never overwrite them with client
     data even if the caller tries to pass them in data.state. */
  const mysteryId = String(threadId);
  const mysteryRef = db.collection('users').doc(uid).collection('mysteries').doc(mysteryId);
  const snap = await mysteryRef.get();
  const existingAthar  = (snap.exists && isCount(snap.data().athar))  ? snap.data().athar  : 0;
  const existingReveal = (snap.exists && !!snap.data().reveal);

  /* choices.branch is accepted only if it is valid for this thread.  If the
     client sends an invalid branch, silently drop it rather than throwing so
     the rest of the state still saves. */
  const rawChoices = (state.choices && typeof state.choices === 'object') ? state.choices : {};
  const sanitizedChoices = {};
  if (rawChoices.branch != null) {
    if (isValidBranch(threadId, String(rawChoices.branch))) {
      sanitizedChoices.branch = String(rawChoices.branch);
    }
    /* Other choice fields (e.g. clue answers logged by the client) pass through. */
    for (const k of Object.keys(rawChoices)) {
      if (k !== 'branch') sanitizedChoices[k] = rawChoices[k];
    }
  } else {
    Object.assign(sanitizedChoices, rawChoices);
  }

  const payload = {
    threadId,
    choices: sanitizedChoices,
    currentChapter: state.currentChapter || null,
    clues: Array.isArray(state.clues) ? state.clues : [],
    completed: Array.isArray(state.completed) ? state.completed : [],
    progressPercent: isCount(state.progressPercent) ? state.progressPercent : 0,
    /* athar and reveal are server-owned — always preserve the stored value. */
    athar: existingAthar,
    reveal: existingReveal,
    updatedAt: FieldValue.serverTimestamp(),
  };
  try {
    await mysteryRef.set(payload, { merge: true });
    return { status: 'success' };
  } catch (err) {
    throw new functions.https.HttpsError('internal', err.message || 'Failed');
  }
});

/* Create the weaver's own document on first sign-in.
   js/auth.js calls this the moment an account attaches, and firestore.rules
   closes `create` on users/{uid} to the server, so this is the only path by
   which the document can come into existence at all.

   It takes identity and nothing else. The numbers are deliberately absent: athar
   and atharPeak are written by the reward transactions above, so a client that
   sent them here would be handing the server a balance to trust, which is the
   thing the rules exist to prevent. wishlist is left at {} rather than taken
   from the request for the same reason — js/firebase.js owns that write and the
   rules allow it. */
exports.initializeAccount = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);

  const text = (v, max) => {
    if (typeof v !== 'string') return '';
    return v.slice(0, max);
  };

  const userRef = db.collection('users').doc(uid);

  try {
    const created = await userRef.get();
    if (created.exists) {
      /* A second sign-in must not roll identity backwards, so only fill in a
         field the caller left unset rather than overwriting what is stored. */
      const patch = {};
      const current = created.data() || {};
      const incoming = {
        displayName: text(data && data.displayName, 120),
        email: text(data && data.email, 200),
        photoURL: text(data && data.photoURL, 500),
      };
      for (const field of Object.keys(incoming)) {
        if (!current[field] && incoming[field]) patch[field] = incoming[field];
      }
      if (Object.keys(patch).length) {
        patch.updatedAt = FieldValue.serverTimestamp();
        await userRef.set(patch, { merge: true });
        return { status: 'success', created: false, updated: true };
      }
      return { status: 'success', created: false, updated: false };
    }

    await userRef.set({
      displayName: text(data && data.displayName, 120),
      email: text(data && data.email, 200),
      photoURL: text(data && data.photoURL, 500),
      memberSince: nowMillis(),
      verified: false,
      badges: [],
      wishlist: {},
      redemptions: {},
      atharBase: 0,
      atharPeak: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { status: 'success', created: true };
  } catch (err) {
    throw new functions.https.HttpsError('internal', err.message || 'Failed');
  }
});
