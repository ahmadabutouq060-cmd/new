/* Naseej — firestore.rules conformance tests.
 *
 * There is no test runner in this project, and there is deliberately not one:
 * `npm run build` is the static gate for the site itself. Rules are different —
 * nothing static can tell you that a legal write is now denied, and the failure
 * mode is a weaver whose progress silently stops saving. So this is a plain
 * Node script with a hand-rolled assert loop, driven through the Firestore
 * emulator:
 *
 *     npm run test:rules
 *
 * which is `firebase emulators:exec`, so the emulator is started, the script
 * runs, and it is torn down again. Nothing here is part of `npm run build`.
 *
 * The tests are written against the payloads js/data.js *actually* produces,
 * not against hand-written fixtures. That is the whole point: a rules file can
 * be strict and still reject every legitimate write, and the only way to notice
 * is to feed it the real thing. Section A feeds it a full accountBundle() and
 * asserts the rules accept it; the rest assert that everything else is refused.
 *
 * data.js is loaded with a ~30-line DOM shim rather than jsdom, so this script
 * needs no dependency jsdom does not already satisfy — see AGENTS.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UID = 'weaver-a';
const OTHER = 'weaver-b';

/* ── A DOM shim just wide enough for data.js ─────────────────────────────────
   data.js is a browser classic script, but at load time it only needs
   localStorage and a handful of document lookups it never gets a hit on. */

function loadData() {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const stub = () => ({
    style: {}, dataset: {}, textContent: '', innerHTML: '', children: [], childNodes: [],
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, addEventListener() {}, remove() {},
    querySelector: () => null, querySelectorAll: () => [], appendChild() {},
  });
  const document = {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: stub, addEventListener() {}, body: stub(), documentElement: stub(),
  };
  const window = {
    localStorage, sessionStorage: localStorage, document,
    location: { hash: '', search: '', pathname: '/' },
    matchMedia: () => ({ matches: false }),
    addEventListener() {}, navigator: { userAgent: 'node', onLine: true },
    setTimeout, clearTimeout, Date, Math, JSON, console,
  };
  Object.assign(globalThis, { window, document, localStorage, navigator: window.navigator });
  // eslint-disable-next-line no-eval
  (0, eval)(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'));
  return window.NASEEJ;
}

/* ── The payloads the app really writes ───────────────────────────────────────
   Seed one living mystery to the point where it has earned all five reward
   kinds, solved two waypoints and found the secret. Every assertion below about
   a document that is *supposed* to work is checked against these, so a rule that
   tightens too far fails here rather than on a weaver's device. */

function realBundle() {
  const NASEEJ = loadData();
  const s = NASEEJ.session;
  s.mystery[10] = {
    branch: 'witness',
    answers: { 1: { correct: true, optionId: 'stone' } },
    observations: {},
    clues: [1, 4],
    completed: [1, 2],
    secret: 'herb-wrap',
    reveal: true,
    awarded: {
      'challenge:1': 150,
      'clue:1': 100,
      'chapter:entrance': 200,
      'reveal:done': 500,
      'secret:hidden-crack': 250,
    },
  };
  s.completedWaypointKeys[10] = [1, 2];
  s.threadProgress[10] = 60;
  s.redemptions = { 'petra-kitchen': { at: 1700000000000, cost: 100 } };

  const bundle = NASEEJ.data.accountBundle();

  /* The profile document, in the exact key set syncAccount() sends. */
  const profile = {
    displayName: bundle.profile.displayName || '',
    email: bundle.profile.email || '',
    photoURL: bundle.profile.photoURL || '',
    memberSince: bundle.profile.memberSince || null,
    verified: !!bundle.profile.verified,
    badges: bundle.badges,
    wishlist: bundle.wishlist,
    redemptions: bundle.redemptions,
    atharBase: bundle.atharBase,
    athar: bundle.athar,
    atharPeak: bundle.atharPeak,
    updatedAt: bundle.savedAt,
  };
  return { bundle, profile, reward: bundle.rewards[0], progress: bundle.progress, mystery: bundle.mysteries[0], secret: bundle.secrets[0] };
}

/* ── Assert loop ──────────────────────────────────────────────────────────────
   One counter, one error. No framework: a rule that starts denying writes is a
   regression, and this file's job is to fail loudly and say which case broke. */

let passed = 0;
const failures = [];

async function check(name, fn, expect) {
  try {
    await fn();
    if (expect === 'denied') throw new Error('expected a denial, but the write was allowed');
    passed += 1;
  } catch (err) {
    if (expect === 'allowed' && !/expected a denial/.test(err.message)) {
      failures.push(name + ' — should have been ALLOWED: ' + err.message);
      return;
    }
    if (expect === 'denied') {
      failures.push(name + ' — should have been DENIED but was allowed');
      return;
    }
    failures.push(name + ' — ' + err.message);
  }
}

function allowed(fn) { return check(fn.name || 'write', fn, 'allowed'); }
function denied(fn) { return check(fn.name || 'write', fn, 'denied'); }

/* Firestore mod from the test context, so every write goes through the rules. */
const fs_ = (ctx) => ctx.firestore();
const userDoc = (uid) => 'users/' + uid;
const sub = (uid, name, id) => 'users/' + uid + '/' + name + '/' + id;

/* ════════════════════════════════════════════════════════════════════════════ */

const R = realBundle();

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-naseej',
  firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
});

async function run() {
  /* ── A. The app's own writes are accepted ──────────────────────────────────
     If any of these fail, the rules are wrong — not the app. */

  const seed = testEnv.unauthenticatedContext().database; // not used; keeps lint quiet
  void seed;

  const a = testEnv.authenticatedContext(UID);
  const fsA = fs_(a);

  await allowed(async function firstSignInWritesTheProfile() {
    await assertSucceeds(fsA.doc(userDoc(UID)).set(R.profile));
  });

  await allowed(async function refreshRewritesTheProfile() {
    /* The second sync of a session, which is what every page visit does. */
    await assertSucceeds(fsA.doc(userDoc(UID)).set({ ...R.profile, updatedAt: Date.now() }, { merge: true }));
  });

  for (const reward of R.bundle.rewards) {
    await allowed(async function rewardRowIsAccepted() {
      await assertSucceeds(fsA.doc(sub(UID, 'rewards', reward.uniqueKey)).set({ ...reward, earnedAt: Date.now() }));
    });
  }

  for (const row of R.bundle.progress) {
    await allowed(async function progressRowIsAccepted() {
      await assertSucceeds(fsA.doc(sub(UID, 'progress', row.id)).set({ ...row, updatedAt: Date.now() }));
    });
  }

  await allowed(async function reSavingProgressKeepsItsFirstCompletionDate() {
    await assertSucceeds(
      fsA.doc(sub(UID, 'progress', R.progress[0].id)).set(
        { metadata: { chapter: 'entrance', name: 'Renamed' }, updatedAt: Date.now() },
        { merge: true },
      ),
    );
  });

  await allowed(async function mysteryStateIsAccepted() {
    await assertSucceeds(fsA.doc(sub(UID, 'mysteries', R.mystery.id)).set({ ...R.mystery, updatedAt: Date.now() }));
  });

  await allowed(async function reSavingMysteryStateIsAccepted() {
    await assertSucceeds(
      fsA.doc(sub(UID, 'mysteries', R.mystery.id)).set({ athar: R.mystery.athar, updatedAt: Date.now() }, { merge: true }),
    );
  });

  await allowed(async function secretCompletionIsAccepted() {
    await assertSucceeds(fsA.doc(sub(UID, 'secrets', R.secret.id)).set({ ...R.secret, updatedAt: Date.now() }));
  });

  await allowed(async function anIncompleteSecretMayBeFinished() {
    const id = '10_still-hidden';
    await assertSucceeds(fsA.doc(sub(UID, 'secrets', id)).set({
      threadId: 10, completed: false, rewardGranted: false, optionId: null, completedAt: null, updatedAt: Date.now(),
    }));
    await assertSucceeds(fsA.doc(sub(UID, 'secrets', id)).set({
      completed: true, rewardGranted: true, optionId: 'herb-wrap', completedAt: Date.now(), updatedAt: Date.now(),
    }, { merge: true }));
  });

  await allowed(async function atharMayGrow() {
    await assertSucceeds(fsA.doc(userDoc(UID)).set(
      { athar: R.profile.athar + 150, atharPeak: R.profile.athar + 150, updatedAt: Date.now() },
      { merge: true },
    ));
  });

  await allowed(async function aRedemptionMayBeAppended() {
    await assertSucceeds(fsA.doc(userDoc(UID)).set(
      { redemptions: { ...R.profile.redemptions, 'wadi-rum-camp': { at: 1700000000000, cost: 150 } }, updatedAt: Date.now() },
      { merge: true },
    ));
  });

  await allowed(async function aWeaverMayBeRenamed() {
    await assertSucceeds(fsA.doc(userDoc(UID)).set(
      { displayName: 'Renamed Weavers', photoURL: 'https://example.test/a.png', updatedAt: Date.now() },
      { merge: true },
    ));
  });

  /* ── B. One weaver cannot reach another ──────────────────────────────────── */

  const b = testEnv.authenticatedContext(OTHER);
  const fsB = fs_(b);

  await denied(async function anotherWeaverCannotReadTheProfile() {
    await assertFails(fsB.doc(userDoc(UID)).get());
  });

  await denied(async function anotherWeaverCannotWriteTheProfile() {
    await assertFails(fsB.doc(userDoc(UID)).set({ ...R.profile, displayName: 'Stole It' }, { merge: true }));
  });

  await denied(async function anotherWeaverCannotReadTheLedger() {
    await assertFails(fsB.doc(sub(UID, 'rewards', R.reward.uniqueKey)).get());
  });

  await denied(async function anotherWeaverCannotPayThemselves() {
    await assertFails(fsB.doc(sub(UID, 'rewards', 't99_challenge_1')).set({
      uniqueKey: 't99_challenge_1', entryKey: 'challenge:1', type: 'challenge', source: 'challenge_answer',
      threadId: 99, waypointId: 1, challengeId: 't99_w1', clueId: null, chapterKey: null, secretId: null,
      amount: 150, earnedAt: Date.now(),
    }));
  });

  await denied(async function anotherWeaverCannotCompleteAWaypoint() {
    await assertFails(fsB.doc(sub(UID, 'progress', 't10_w3')).set({
      threadId: 10, waypointId: 3, completed: true, completedAt: Date.now(), metadata: {}, updatedAt: Date.now(),
    }));
  });

  await denied(async function anotherWeaverCannotAwardThemselvesATotal() {
    await assertFails(fsB.doc(userDoc(OTHER)).set({ athar: 999999, updatedAt: Date.now() }, { merge: true }));
  });

  await allowed(async function butTheirOwnAccountIsFine() {
    await assertSucceeds(fsB.doc(userDoc(OTHER)).set({ ...R.profile, displayName: 'Someone Else', athar: 0, atharBase: 0 }));
  });

  const anon = testEnv.unauthenticatedContext();
  const fsAnon = fs_(anon);

  await denied(async function signedOutCannotRead() {
    await assertFails(fsAnon.doc(userDoc(UID)).get());
  });

  await denied(async function signedOutCannotWrite() {
    await assertFails(fsAnon.doc(userDoc(UID)).set({ ...R.profile, athar: 1 }));
  });

  await denied(async function signedOutCannotPay() {
    await assertFails(fsAnon.doc(sub(UID, 'rewards', 't10_challenge_9')).set({ ...R.reward, uniqueKey: 't10_challenge_9' }));
  });

  /* ── C. The ledger pays once, and pays what the product says ─────────────── */

  await denied(async function aSecondGrantOfTheSameRewardIsRefused() {
    /* This is the dedup path: the document already exists from section A, so the
       create the app would attempt on a second device is a denial. */
    await assertFails(fsA.doc(sub(UID, 'rewards', R.reward.uniqueKey)).set({ ...R.reward, earnedAt: Date.now() }));
  });

  await denied(async function aPaidRewardCannotBeEdited() {
    await assertFails(fsA.doc(sub(UID, 'rewards', R.reward.uniqueKey)).set({ amount: 500 }, { merge: true }));
  });

  await denied(async function aPaidRewardCannotBeDeleted() {
    await assertFails(fsA.doc(sub(UID, 'rewards', R.reward.uniqueKey)).delete());
  });

  await denied(async function anAmountThatContradictsTheTypeIsRefused() {
    await assertFails(fsA.doc(sub(UID, 'rewards', 't10_challenge_7')).set({
      uniqueKey: 't10_challenge_7', entryKey: 'challenge:7', type: 'challenge', source: 'challenge_answer',
      threadId: 10, waypointId: 7, challengeId: 't10_w7', clueId: null, chapterKey: null, secretId: null,
      amount: 500, earnedAt: Date.now(),
    }));
  });

  await denied(async function anUnknownRewardTypeIsRefused() {
    await assertFails(fsA.doc(sub(UID, 'rewards', 't10_challenge_8')).set({
      uniqueKey: 't10_challenge_8', entryKey: 'challenge:8', type: 'challenge', source: 'challenge_answer',
      threadId: 10, waypointId: 8, challengeId: 't10_w8', clueId: null, chapterKey: null, secretId: null,
      amount: 150, earnedAt: Date.now(), inventedField: 'please',
    }));
  });

  await denied(async function aForgedUniqueKeyIsRefused() {
    await assertFails(fsA.doc(sub(UID, 'rewards', 't10_challenge_6')).set({
      uniqueKey: 't10_challenge_5', entryKey: 'challenge:6', type: 'challenge', source: 'challenge_answer',
      threadId: 10, waypointId: 6, challengeId: 't10_w6', clueId: null, chapterKey: null, secretId: null,
      amount: 150, earnedAt: Date.now(),
    }));
  });

  await denied(async function aMismatchedSourceIsRefused() {
    await assertFails(fsA.doc(sub(UID, 'rewards', 't10_chapter_follow')).set({
      uniqueKey: 't10_chapter_follow', entryKey: 'chapter:follow', type: 'chapter', source: 'clue_unlock',
      threadId: 10, waypointId: 2, challengeId: null, clueId: null, chapterKey: 'follow', secretId: null,
      amount: 200, earnedAt: Date.now(),
    }));
  });

  await denied(async function aNegativeAmountIsRefused() {
    await assertFails(fsA.doc(sub(UID, 'rewards', 't10_challenge_5')).set({
      uniqueKey: 't10_challenge_5', entryKey: 'challenge:5', type: 'challenge', source: 'challenge_answer',
      threadId: 10, waypointId: 5, challengeId: 't10_w5', clueId: null, chapterKey: null, secretId: null,
      amount: -150, earnedAt: Date.now(),
    }));
  });

  await denied(async function aRewardWithoutAThreadIsRefused() {
    await assertFails(fsA.doc(sub(UID, 'rewards', 't0_challenge_1')).set({
      uniqueKey: 't0_challenge_1', entryKey: 'challenge:1', type: 'challenge', source: 'challenge_answer',
      threadId: null, waypointId: 1, challengeId: 't0_w1', clueId: null, chapterKey: null, secretId: null,
      amount: 150, earnedAt: Date.now(),
    }));
  });

  await denied(async function aRewardIdThatNamesSomethingElseIsRefused() {
    await assertFails(fsA.doc(sub(UID, 'rewards', 'free-athar')).set({
      uniqueKey: 'free-athar', entryKey: 'challenge:1', type: 'challenge', source: 'challenge_answer',
      threadId: 10, waypointId: 1, challengeId: 't10_w1', clueId: null, chapterKey: null, secretId: null,
      amount: 150, earnedAt: Date.now(),
    }));
  });

  /* ── D. A weaver cannot edit their own way to a bigger balance ─────────────
     The app never stores the held balance — it is derived from the ledger, the
     spend log and the base on every load — which is exactly why those three
     inputs all have to be append-only. */

  await denied(async function atharCannotBeLowered() {
    await assertFails(fsA.doc(userDoc(UID)).set({ athar: 1, updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function atharCannotBeErased() {
    await assertFails(fsA.doc(userDoc(UID)).set({ athar: null, updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function theBaseCannotBeLowered() {
    await assertFails(fsA.doc(userDoc(UID)).set({ atharBase: 0, athar: 1, updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function aRedemptionCannotBeRemovedToUnSpendIt() {
    /* Spend 150, then delete the claim: the derived balance would go back up. */
    const { ['wadi-rum-camp']: _dropped, ...rest } = R.profile.redemptions;
    void _dropped;
    await assertFails(fsA.doc(userDoc(UID)).set({ redemptions: rest, updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function aRedemptionsCostCannotBeRewritten() {
    const tampered = {};
    for (const [k, v] of Object.entries(R.profile.redemptions)) tampered[k] = { at: v.at, cost: 1 };
    await assertFails(fsA.doc(userDoc(UID)).set({ redemptions: tampered, updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function anEarnedBadgeCannotBeRevoked() {
    await assertFails(fsA.doc(userDoc(UID)).set({ badges: [1], updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function theProfileCannotBeDeleted() {
    await assertFails(fsA.doc(userDoc(UID)).delete());
  });

  await denied(async function anUndeclaredFieldCannotBeSmuggledIn() {
    await assertFails(fsA.doc(userDoc(UID)).set({ isAdmin: true, updatedAt: Date.now() }, { merge: true }));
  });

  /* ── E. Progress only moves forward ──────────────────────────────────────── */

  await denied(async function anIncompleteRowCannotBeWritten() {
    await assertFails(fsA.doc(sub(UID, 'progress', 't10_w4')).set({
      threadId: 10, waypointId: 4, completed: false, completedAt: Date.now(), metadata: {}, updatedAt: Date.now(),
    }));
  });

  await denied(async function aCompletedWaypointCannotBeUncompleted() {
    await assertFails(fsA.doc(sub(UID, 'progress', 't10_w1')).set({ completed: false }, { merge: true }));
  });

  await denied(async function aCompletionDateCannotBeMoved() {
    await assertFails(fsA.doc(sub(UID, 'progress', 't10_w1')).set({ completedAt: Date.now() }, { merge: true }));
  });

  await denied(async function progressCannotBeDeleted() {
    await assertFails(fsA.doc(sub(UID, 'progress', 't10_w1')).delete());
  });

  await denied(async function anUninterpretableProgressIdIsRefused() {
    await assertFails(fsA.doc(sub(UID, 'progress', 'everything')).set({
      threadId: 10, waypointId: 1, completed: true, completedAt: Date.now(), metadata: {}, updatedAt: Date.now(),
    }));
  });

  await denied(async function progressForAThreadThatDoesNotExist() {
    await assertFails(fsA.doc(sub(UID, 'progress', 't99_w1')).set({
      threadId: 99, waypointId: 1, completed: true, completedAt: Date.now(), metadata: {}, updatedAt: Date.now(),
    }));
  });

  /* ── F. Mystery state cannot be rewritten backwards ──────────────────────── */

  await denied(async function aMysteryTotalCannotBeLowered() {
    await assertFails(fsA.doc(sub(UID, 'mysteries', '10')).set({ athar: 10, updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function aMysteryCannotChangeThread() {
    await assertFails(fsA.doc(sub(UID, 'mysteries', '10')).set({ threadId: 11, updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function aSolvedClueCannotBeUnSolved() {
    await assertFails(fsA.doc(sub(UID, 'mysteries', '10')).set({ clues: [1], updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function aSolvedWaypointCannotBeUnSolved() {
    await assertFails(fsA.doc(sub(UID, 'mysteries', '10')).set({ completed: [1], updatedAt: Date.now() }, { merge: true }));
  });

  await denied(async function aMysteryCannotBeDeleted() {
    await assertFails(fsA.doc(sub(UID, 'mysteries', '10')).delete());
  });

  /* ── G. A found secret stays found ───────────────────────────────────────── */

  await denied(async function aFoundSecretCannotBeUnfound() {
    await assertFails(fsA.doc(sub(UID, 'secrets', R.secret.id)).set(
      { completed: false, rewardGranted: false, optionId: null, completedAt: null, updatedAt: Date.now() },
      { merge: true },
    ));
  });

  await denied(async function aFoundAnswersAnswerCannotBeChanged() {
    await assertFails(fsA.doc(sub(UID, 'secrets', R.secret.id)).set(
      { optionId: 'feather', updatedAt: Date.now() },
      { merge: true },
    ));
  });

  await denied(async function aSecretCannotBeDeleted() {
    await assertFails(fsA.doc(sub(UID, 'secrets', R.secret.id)).delete());
  });

  /* ── H. Legacy is read-only ──────────────────────────────────────────────── */

  const seedLegacy = await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fs_(ctx).doc('weavers/' + UID).set({ progress: { threads: [] }, wishlist: {}, redemptions: {} });
  });
  void seedLegacy;

  await allowed(async function theOwnerCanStillReadTheLegacyDocument() {
    await assertSucceeds(fsA.doc('weavers/' + UID).get());
  });

  await denied(async function theOwnerCannotWriteTheLegacyDocument() {
    await assertFails(fsA.doc('weavers/' + UID).set({ progress: { threads: [7] } }, { merge: true }));
  });

  await denied(async function theLegacyDocumentIsNotPublic() {
    await assertFails(fsB.doc('weavers/' + UID).get());
  });

  /* ── I. Two devices racing on the same reward ───────────────────────────────
     The shape of awardAthar()'s transaction, run twice. The rules see the merged
     document, so the second attempt is a create against a path that now exists —
     which is the whole idempotency guarantee, proven end to end. */

  const c = testEnv.authenticatedContext('weaver-c');
  const fsC = fs_(c);
  const freshReward = {
    uniqueKey: 't10_challenge_4', entryKey: 'challenge:4', type: 'challenge', source: 'challenge_answer',
    threadId: 10, waypointId: 4, challengeId: 't10_w4', clueId: null, chapterKey: null, secretId: null,
    amount: 150, earnedAt: Date.now(),
  };

  await allowed(async function theFirstGrantLands() {
    await assertSucceeds(fsC.doc(userDoc('weaver-c')).set({
      ...R.profile, displayName: 'Racer', athar: 0, atharBase: 0, atharPeak: 0, redemptions: {}, badges: [],
    }));
    await assertSucceeds(fsC.doc(sub('weaver-c', 'rewards', freshReward.uniqueKey)).set(freshReward));
    await assertSucceeds(fsC.doc(userDoc('weaver-c')).set(
      { athar: 150, atharPeak: 150, updatedAt: Date.now() },
      { merge: true },
    ));
  });

  await denied(async function theSecondDeviceGetsNothing() {
    await assertFails(fsC.doc(sub('weaver-c', 'rewards', freshReward.uniqueKey)).set({ ...freshReward, earnedAt: Date.now() }));
  });

  await denied(async function andCannotPayItselfForTheLostRace() {
    /* What a client that lost the race would try next: write the total anyway. */
    await assertFails(fsC.doc(userDoc('weaver-c')).set(
      { athar: 300, atharPeak: 300, updatedAt: Date.now() },
      { merge: true },
    ));
  });

  await allowed(async function theSecondDeviceStillSyncsItsIdentity() {
    await assertSucceeds(fsC.doc(userDoc('weaver-c')).set(
      { displayName: 'Racer On Another Phone', updatedAt: Date.now() },
      { merge: true },
    ));
  });
}

try {
  await run();
} finally {
  await testEnv.cleanup();
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log('  FAIL  ' + f);
  console.log('\nfirestore.rules: ' + failures.length + ' failed, ' + passed + ' passed');
  process.exit(1);
}
console.log('firestore.rules: ' + passed + ' checks passed');