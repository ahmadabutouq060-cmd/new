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
  /* Number(undefined) is NaN and NaN == null is false, so a missing waypointId
     would fall through to the per-waypoint branch and be filed under 'w0'.
     Coerce first and keep null, the way progressRows() in js/data.js spells it. */
  const waypointId = data.waypointId == null ? null : Number(data.waypointId);

  /* No reward is granted here. completeChallenge is the only path that pays, and
     it validates the answer server-side; this records progress so a client that
     solved the answer offline still keeps its row. The rewardDoc that used to be
     built above was discarded without being read. */
  // The document id is the same one progressRows() in js/data.js produces, so the
  // server writer and the client's row addressing name one document rather than
  // two. Anything else would orphan the client's row on every sync.
  const progressId =
    waypointId == null
      ? 't' + threadId + '_progress'
      : 't' + threadId + '_w' + docSafe(waypointId);
  const progressRef = db.collection('users').doc(uid).collection('progress').doc(progressId);
  const existing = await progressRef.get();
  if (existing.exists) {
    return { status: 'success', awarded: false, reason: 'already' };
  }

  // Grant reward if appropriate (if a challenge reward exists by key, maybe not double; but we only write progress)
  // Keep minimal: write progress only after ensuring no double grant? Not strictly needed if rules prevent
  const progressData = {
    threadId,
    waypointId,
    completed: true,
    completedAt: nowMillis(),
    metadata: {},
    updatedAt: FieldValue.serverTimestamp(),
  };
  await progressRef.set(progressData);
  return { status: 'success', awarded: false };
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
  const branchId = String(data.branchId || '');

  // Branch choice is part of hero progression; server records minimal state if needed
  const mysteryRef = db.collection('users').doc(uid).collection('mysteries').doc(String(threadId));
  const snap = await mysteryRef.get();
  if (snap.exists && snap.data().threadId === threadId) {
    // if branch already set, don't overwrite in a harmful way per rules (but rules allow updates as long as monotonic)
    const d = snap.data();
    if (d.branch && d.branch !== branchId) {
      // don't change; just return existing
      return { status: 'success', branch: d.branch, changed: false };
    }
  }
  await mysteryRef.set({
    threadId,
    choices: { branch: branchId },
    currentChapter: data.currentChapter || null,
    clues: FieldValue.arrayUnion ? snap.exists ? snap.data().clues || [] : [] : [],
    completed: snap.exists ? snap.data().completed || [] : [],
    progressPercent: 50,
    athar: snap.exists ? (isCount(snap.data().athar) ? snap.data().athar : 0) : 0,
    reveal: !!data.reveal,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { status: 'success', branch: branchId, changed: true };
});

exports.saveMysteryState = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const threadId = Number(data.threadId || data.id);
  const mysteryId = String(threadId || data.id);
  const state = data.state || data || {};
  const mysteryRef = db.collection('users').doc(uid).collection('mysteries').doc(mysteryId);
  const payload = {
    threadId,
    choices: state.choices || {},
    currentChapter: state.currentChapter || null,
    clues: Array.isArray(state.clues) ? state.clues : [],
    completed: Array.isArray(state.completed) ? state.completed : [],
    progressPercent: isCount(state.progressPercent) ? state.progressPercent : 0,
    athar: isCount(state.athar) ? state.athar : 0,
    reveal: !!state.reveal,
    updatedAt: FieldValue.serverTimestamp(),
  };
await mysteryRef.set(payload, { merge: true });
  return { status: 'success' };
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
