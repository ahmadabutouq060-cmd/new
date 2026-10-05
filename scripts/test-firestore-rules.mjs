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
 * WHAT THIS ASSERTS. firestore.rules is server-authoritative, and that is the
 * whole policy in one sentence: a browser may read its own documents, may write
 * its mysteries, and may merge {wishlist, updatedAt} onto its profile. It may do
 * nothing else. Everything named a ledger — rewards, progress, secrets, the athar
 * balance, badges, redemptions, and the creation of the account itself — belongs
 * to Cloud Functions.
 *
 * These tests therefore mostly assert DENIALS, which is unusual and deliberate.
 * An earlier revision of this file asserted that a browser could write the reward
 * ledger, the progress rows and the secrets, and that it could grow its own athar
 * and rename itself — i.e. it tested the rules file against itself and passed for
 * as long as the rules file stayed permissive. Every one of those assertions was
 * a vulnerability described as a contract. An earlier build had shipped a
 * Firestore rules file that had been loosened to match a client-side reward
 * transaction; nothing in the build noticed, because the client and the rules
 * had been changed together and the site then "worked".
 *
 * So each case below is written as what an attacker or a stale client would
 * actually attempt, and what must happen instead. The section that matters most
 * is B: it asserts that a browser cannot pay itself.
 *
 * data.js is loaded with a ~30-line DOM shim rather than jsdom, so this script
 * needs no dependency jsdom does not already satisfy — see AGENTS.md.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  initializeTestEnvironment,
  assertSucceeds,
} from "@firebase/rules-unit-testing"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const UID = "weaver-a"
const OTHER = "weaver-b"

/* ── DOM shim ──────────────────────────────────────────────────────────────────
   data.js is a browser classic script, but at load time it only needs
   localStorage and a handful of document lookups it never gets a hit on. */

function loadData() {
  const store = new Map()
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
  const stub = () => ({
    style: {},
    dataset: {},
    textContent: "",
    innerHTML: "",
    children: [],
    childNodes: [],
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {},
    getAttribute: () => null,
    addEventListener() {},
    remove() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild() {},
  })
  const document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: stub,
    addEventListener() {},
    body: stub(),
    documentElement: stub(),
  }
  const window = {
    localStorage,
    sessionStorage: localStorage,
    document,
    location: { hash: "", search: "", pathname: "/" },
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    navigator: { userAgent: "node", onLine: true },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    console,
  }
  Object.assign(globalThis, {
    window,
    document,
    localStorage,
  })
  /* Node 21 added a getter-only `globalThis.navigator`, so a plain assignment
     throws "Cannot set property navigator of #<Object> which has only a getter"
     and the whole suite dies before its first assertion. defineProperty
     replaces the accessor rather than writing through it. */
  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true,
    writable: true,
  })
  ;(0, eval)(fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8"))
  return window.NASEEJ
}

/* ── The payloads the app really holds ──────────────────────────────────────────
   Still built from accountBundle(), because the shapes below are the shapes the
   product uses: a real mystery document at a real thread, the real reward
   entries, the real progress ids. What changed is the verdict on each one. */

function realBundle() {
  const NASEEJ = loadData()
  const s = NASEEJ.session
  s.mystery[10] = {
    branch: "witness",
    answers: { 1: { correct: true, optionId: "stone" } },
    observations: {},
    clues: [1, 4],
    completed: [1, 2],
    secret: "herb-wrap",
    reveal: true,
    awarded: {
      "challenge:1": 150,
      "clue:1": 100,
      "chapter:entrance": 200,
      "reveal:done": 500,
      "secret:hidden-crack": 250,
    },
  }
  s.completedWaypointKeys[10] = [1, 2]
  s.threadProgress[10] = 60
  s.redemptions = { "petra-kitchen": { at: 1700000000000, cost: 100 } }

  const bundle = NASEEJ.data.accountBundle()

  /* The bundle rows carry a local `id` for the UI, which is never sent to
     Firestore — strip it the way the app does, so a failure here is a real one. */
  const withoutId = (row) => {
    const { id, ...rest } = row
    void id
    return rest
  }

  const progressIds = {}
  bundle.progress.forEach((row) => {
    progressIds[row.threadId + ":" + row.waypointId] = row.id
  })

  return {
    bundle,
    reward: withoutId(bundle.rewards[0]),
    progress: bundle.progress.map(withoutId),
    progressIds,
    mysteryId: bundle.mysteries[0].id,
    mystery: withoutId(bundle.mysteries[0]),
    secretId: bundle.secrets[0].id,
    secret: withoutId(bundle.secrets[0]),
  }
}

/* ── Assert loop ───────────────────────────────────────────────────────────────
   No framework, but five counters rather than one, because "the write was
   refused" and "the rule blew up while refusing it" are not the same result and
   this suite used to conflate them.

   The SDK's assertFails resolves for a clean PERMISSION_DENIED *and* for a
   rules evaluation error, then throws the message away. So every correctly
   denied write counted as a pass even when the denial was an accident — which
   is how a rule like `mysteryShapeOk`, dereferencing request.resource.data on a
   delete where that is null, could register as nine green security tests. The
   local assertFails below keeps the message, and check() sorts each outcome into
   exactly one bucket. An evaluation error is never a passing DENY. */

/* The gate: only a genuine permission verdict is evidence about the rules.
   Everything else that rejects — a Deadline, a NOT_FOUND, a payload the SDK
   refused to encode, a document path the client rejected before the rules were
   ever consulted — is a broken test, and has to be counted as one.

   This is deliberately an ALLOWLIST of what a denial looks like, replacing the
   denylist of things that used to count as one. A denylist cannot enumerate
   every way a Firestore call fails, so any error string nobody anticipated
   passes straight through it and is recorded as a security win. The denylist
   this replaces (`evaluation error|null value error|...`) had exactly that
   hole: `Deadline exceeded` under emulator load, or `Cannot use "undefined" as
   a Firestore value`, turned a broken test into a green one. Matching on the
   permission status instead fails closed — an error we do not recognise is a
   TEST ERROR, never a pass. */
const PERMISSION_DENIED =
  /permission[_ ]denied|insufficient permissions|not authorized|do(es)? not have permission/i

let allowPass = 0
let denyPass = 0
const unexpectedAllow = []
const unexpectedDeny = []
const evalErrors = []

/* Throws either way; the marker on the error is what check() reads.
   `Promise.resolve(op)`, not `Promise.resolve().then(op)`: every call site
   passes an in-flight promise, and then() ignores a non-callable value, which
   left the write's own rejection unhandled and crashed the run. */
function assertFails(op) {
  return Promise.resolve(op).then(
    () => {
      throw Object.assign(new Error("WRITE_WAS_ALLOWED"), { verdict: "allowed" })
    },
    (err) => {
      throw Object.assign(new Error("WRITE_WAS_DENIED"), {
        verdict: "denied",
        /* `code` is the load-bearing field and it is easy to lose. The SDK puts
           the gRPC status here ("permission-denied") and, for writes, also in
           the message — but for a denied READ the message carries only the rules
           trace ("false for 'get' @ L91"), with no status in it. Keying the gate
           off the message alone therefore demoted four genuine read refusals to
           TEST ERRORs, which is the mirror image of the bug this replaced. */
        code: err && err.code,
        detail: String((err && err.message) || err),
      })
    },
  )
}

const clip = (s) => s.replace(/\s+/g, " ").trim().slice(0, 220)

async function check(name, fn, expect) {
  try {
    await fn()
    /* Resolving means the operation really was permitted. For a `denied()` case
       the only way to get here is assertFails reporting WRITE_WAS_ALLOWED. */
    if (expect === "allowed") allowPass += 1
    else unexpectedAllow.push(name + " — the write was allowed")
  } catch (err) {
    const detail = clip(String((err && err.detail) || (err && err.message) || err))
    const wasDenied = err && err.verdict === "denied"
    /* The gRPC status code is the authoritative signal and is checked first; the
       message pattern is the fallback for an error object that did not come from
       the SDK. Either alone would be wrong — the code alone says nothing about
       WHICH rule refused, and the message alone is absent on read refusals. */
    const isDenial = (err && err.code) === "permission-denied" || PERMISSION_DENIED.test(detail)

    if (expect === "denied") {
      /* Three outcomes, never two: permitted (a FAIL), refused by the rules (the
         only PASS), or refused by something that is not the rules (a TEST
         ERROR — a broken case must not be able to look like a secured one). */
      if (wasDenied && isDenial) denyPass += 1
      else if (wasDenied) evalErrors.push(`${name} — rejected, but not by the rules: ${detail}`)
      else unexpectedAllow.push(`${name} — ${detail}`)
      return
    }

    /* expect === "allowed". A permission refusal is a real failure of the rules,
       because the rules did refuse something the product needs. Any other error
       means the case never got as far as the rules — a bad payload, a bad path,
       a timeout — so it is a broken test, not a verdict on firestore.rules. */
    if (isDenial) unexpectedDeny.push(`${name} — ${detail}`)
    else evalErrors.push(`${name} — ${detail}`)
  }
}

/* `label` exists because one case in a loop cannot report which iteration broke:
   R.progress holds a row per completed stop, and N cases all named
   "aProgressRowCannotBeWritten" left a failure unattributable. */
function allowed(fn, label) {
  return check(label || fn.name || "write", fn, "allowed")
}
function denied(fn, label) {
  return check(label || fn.name || "write", fn, "denied")
}

const fs_ = (ctx) => ctx.firestore()
const userDoc = (uid) => "users/" + uid
const sub = (uid, name, id) => "users/" + uid + "/" + name + "/" + id
const NOW = Date.now()

const R = realBundle()

const testEnv = await initializeTestEnvironment({
  projectId: "demo-naseej",
  firestore: {
    rules: fs.readFileSync(path.join(ROOT, "firestore.rules"), "utf8"),
  },
})

/* Every account has to exist before anything else can be asserted, and no
   browser may create one — so the suite seeds them the way initializeAccount
   does, through withSecurityRulesDisabled, which is what the Admin SDK does.
   If this section fails, every later denial would "pass" for the wrong reason. */
async function seedAccount(uid, extra = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fs_(ctx)
      .doc(userDoc(uid))
      .set({
        displayName: "Seeded",
        email: uid + "@example.test",
        photoURL: null,
        memberSince: NOW,
        verified: false,
        badges: [],
        wishlist: {},
        redemptions: {},
        atharBase: 0,
        athar: 0,
        atharPeak: 0,
        updatedAt: NOW,
        ...extra,
      })
  })
}

async function run() {
  await seedAccount(UID)
  await seedAccount(OTHER)

  /* ── A. The two writes a browser is allowed to make ───────────────────────── */

  const a = testEnv.authenticatedContext(UID)
  const fsA = fs_(a)

  await allowed(async function wishlistMayBeSaved() {
    /* Exactly what syncAccount() sends on every sign-in. */
    await assertSucceeds(
      fsA.doc(userDoc(UID)).set({ wishlist: { "gift-card": { at: NOW } }, updatedAt: NOW }, { merge: true }),
    )
  })

  await allowed(async function anEmptyWishlistMergeStillWorks() {
    await assertSucceeds(fsA.doc(userDoc(UID)).set({ wishlist: {}, updatedAt: NOW }, { merge: true }))
  })

  await allowed(async function mysteryStateIsAccepted() {
    await assertSucceeds(
      fsA.doc(sub(UID, "mysteries", R.mysteryId)).set({ ...R.mystery, updatedAt: NOW }),
    )
  })

  await allowed(async function reSavingMysteryStateIsAccepted() {
    await assertSucceeds(
      fsA
        .doc(sub(UID, "mysteries", R.mysteryId))
        .set({ athar: R.mystery.athar, updatedAt: NOW }, { merge: true }),
    )
  })

  await allowed(async function theirOwnDocumentsAreReadable() {
    await assertSucceeds(fsA.doc(userDoc(UID)).get())
    await assertSucceeds(fsA.doc(sub(UID, "rewards", R.reward.uniqueKey)).get())
  })

  /* ── B. A browser cannot pay itself ──────────────────────────────────────────
     Every case here is something the old client did on every sign-in. Under a
     permissive rules file all of these succeeded, which is why the shipped
     client-side award transaction looked like it worked. */

  await denied(async function theProfileCannotBeCreatedByTheClient() {
    /* A tampered first sync arriving already rich. This is why initializeAccount
       exists: under `create, delete: if false` it is the only way in.

       The path has to be users/weaver-fresh. A bare `weaver-fresh` is one
       segment, which is not a document path at all — the client rejects it
       before the rules are ever consulted, so the case would be asserting a
       client-side error rather than a rule. */
    await assertFails(
      fsA.doc(userDoc("weaver-fresh")).set({ athar: 5000, wishlist: {} }),
    )
  })

  await denied(async function atharCannotBeRaised() {
    await assertFails(fsA.doc(userDoc(UID)).set({ athar: 999999, updatedAt: NOW }, { merge: true }))
  })

  await denied(async function atharPeakCannotBeRaised() {
    await assertFails(fsA.doc(userDoc(UID)).set({ atharPeak: 999999, updatedAt: NOW }, { merge: true }))
  })

  await denied(async function atharBaseCannotBeRaised() {
    /* THE exploit growsOnly() failed to stop: a single upward write, then every
       later write legal, and a permanent floor on the displayed balance. */
    await assertFails(fsA.doc(userDoc(UID)).set({ atharBase: 999999, updatedAt: NOW }, { merge: true }))
  })

  await denied(async function atharBaseCannotBeLoweredEither() {
    /* Give the account a non-zero base first. seedAccount() writes
       atharBase: 0, so a client "lowering" it to 0 changes nothing, diff()
       reports no affected key for it, and the write is legitimately allowed —
       the earlier version of this test was passing for the wrong reason. The
       refusal only exists once there is something to refuse. */
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await fs_(ctx).doc(userDoc(UID)).set({ atharBase: 900, updatedAt: NOW }, { merge: true })
    })
    await assertFails(
      fsA.doc(userDoc(UID)).set({ atharBase: 0, updatedAt: NOW }, { merge: true }),
    )
  })

  await denied(async function aRedemptionCannotBeAppendedByTheClient() {
    await assertFails(
      fsA
        .doc(userDoc(UID))
        .set({ redemptions: { "wadi-rum-camp": { at: NOW, cost: 150 } }, updatedAt: NOW }, { merge: true }),
    )
  })

  await denied(async function aRedemptionCannotBeRemovedToUnSpendIt() {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await fs_(ctx).doc(userDoc(UID)).set(
        { redemptions: { "wadi-rum-camp": { at: NOW, cost: 150 } }, updatedAt: NOW },
        { merge: true },
      )
    })
    await assertFails(
      fsA.doc(userDoc(UID)).set({ redemptions: {}, updatedAt: NOW }, { merge: true }),
    )
  })

  await denied(async function aBadgeCannotBeAwardedByTheClient() {
    await assertFails(fsA.doc(userDoc(UID)).set({ badges: [10], updatedAt: NOW }, { merge: true }))
  })

  await denied(async function identityCannotBeForgedByTheClient() {
    /* displayName/email/photoURL are the Google account's, taken server-side by
       initializeAccount, so a client cannot rename itself into "verified". */
    await assertFails(
      fsA.doc(userDoc(UID)).set({ displayName: "Someone Else", verified: true, updatedAt: NOW }, { merge: true }),
    )
  })

  await denied(async function theProfileCannotBeDeleted() {
    await assertFails(fsA.doc(userDoc(UID)).delete())
  })

  await denied(async function aRewardCannotBeWritten() {
    await assertFails(fsA.doc(sub(UID, "rewards", R.reward.uniqueKey)).set({ ...R.reward, earnedAt: NOW }))
  })

  await denied(async function aRewardCannotBeEditedAfterTheFact() {
    await assertFails(fsA.doc(sub(UID, "rewards", R.reward.uniqueKey)).set({ amount: 500 }, { merge: true }))
  })

  await denied(async function aRewardCannotBeDeleted() {
    await assertFails(fsA.doc(sub(UID, "rewards", R.reward.uniqueKey)).delete())
  })

  for (const row of R.progress) {
    await denied(
      async function aProgressRowCannotBeWritten() {
        await assertFails(
          fsA.doc(sub(UID, "progress", R.progressIds[row.threadId + ":" + row.waypointId])).set({ ...row, updatedAt: NOW }),
        )
      },
      `aProgressRowCannotBeWritten(${row.threadId}:${row.waypointId})`,
    )
  }

  await denied(async function aWaypointCannotBeUnCompleted() {
    await assertFails(fsA.doc(sub(UID, "progress", "t10_w1")).set({ completed: false }, { merge: true }))
  })

  await denied(async function aProgressRowCannotBeDeleted() {
    await assertFails(fsA.doc(sub(UID, "progress", "t10_w1")).delete())
  })

  await denied(async function aSecretCannotBeClaimed() {
    await assertFails(fsA.doc(sub(UID, "secrets", "10_hidden-crack")).set({ ...R.secret, updatedAt: NOW }))
  })

  await denied(async function aSecretCannotBeUnFound() {
    await assertFails(
      fsA.doc(sub(UID, "secrets", "10_hidden-crack")).set({ completed: false, updatedAt: NOW }, { merge: true }),
    )
  })

  await denied(async function aSecretCannotBeDeleted() {
    await assertFails(fsA.doc(sub(UID, "secrets", "10_hidden-crack")).delete())
  })

  await denied(async function aFieldCannotBeSmuggledInWithTheWishlist() {
    /* hasOnly() is the guard; this is the shape of the attack it stops — a
       permitted key carried alongside a forbidden one in a single merge. */
    await assertFails(
      fsA.doc(userDoc(UID)).set({ wishlist: {}, isAdmin: true, updatedAt: NOW }, { merge: true }),
    )
  })

  await denied(async function aMysteryCannotRaiseItsOwnBalance() {
    /* The client owns this document, but athar inside it is still pinned: it is
       mirrored from the ledger, so a writable copy would be a second mint. */
    await assertFails(
      fsA.doc(sub(UID, "mysteries", R.mysteryId)).set({ athar: R.mystery.athar + 100000, updatedAt: NOW }, { merge: true }),
    )
  })

  await denied(async function aMysteryCannotChangeThread() {
    await assertFails(
      fsA.doc(sub(UID, "mysteries", R.mysteryId)).set({ threadId: 11, updatedAt: NOW }, { merge: true }),
    )
  })

  await denied(async function aMysteryCannotBeDeleted() {
    await assertFails(fsA.doc(sub(UID, "mysteries", R.mysteryId)).delete())
  })

  /* ── C. One weaver cannot reach another ───────────────────────────────────── */

  const b = testEnv.authenticatedContext(OTHER)
  const fsB = fs_(b)

  await denied(async function anotherWeaverCannotReadTheProfile() {
    await assertFails(fsB.doc(userDoc(UID)).get())
  })

  await denied(async function anotherWeaverCannotReadTheLedger() {
    await assertFails(fsB.doc(sub(UID, "rewards", R.reward.uniqueKey)).get())
  })

  await denied(async function anotherWeaverCannotWriteTheirOwnWishlistInto() {
    await assertFails(fsB.doc(userDoc(UID)).set({ wishlist: {}, updatedAt: NOW }, { merge: true }))
  })

  await denied(async function anotherWeaverCannotWriteTheirOwnMysteryInto() {
    await assertFails(fsB.doc(sub(UID, "mysteries", R.mysteryId)).set({ ...R.mystery, updatedAt: NOW }))
  })

  await allowed(async function butTheirOwnAccountIsFine() {
    /* Same person, second uid: the rules are per-document owner, not per-role. */
    await seedAccount(OTHER)
    await assertSucceeds(
      fsB.doc(userDoc(OTHER)).set({ wishlist: { "gift-card": { at: NOW } }, updatedAt: NOW }, { merge: true }),
    )
  })

  /* ── D. Signed out ────────────────────────────────────────────────────────── */

  const anon = testEnv.unauthenticatedContext()
  const fsAnon = fs_(anon)

  await denied(async function signedOutCannotRead() {
    await assertFails(fsAnon.doc(userDoc(UID)).get())
  })

  await denied(async function signedOutCannotWriteAWishlist() {
    await assertFails(fsAnon.doc(userDoc(UID)).set({ wishlist: {}, updatedAt: NOW }, { merge: true }))
  })

  await denied(async function signedOutCannotWriteAMystery() {
    await assertFails(fsAnon.doc(sub(UID, "mysteries", R.mysteryId)).set({ ...R.mystery, updatedAt: NOW }))
  })

  /* ── E. Legacy is read-only ───────────────────────────────────────────────── */

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fs_(ctx)
      .doc("weavers/" + UID)
      .set({ progress: { threads: [] }, wishlist: {}, redemptions: {} })
  })

  await allowed(async function theOwnerCanStillReadTheLegacyDocument() {
    await assertSucceeds(fsA.doc("weavers/" + UID).get())
  })

  await denied(async function theOwnerCannotWriteTheLegacyDocument() {
    await assertFails(fsA.doc("weavers/" + UID).set({ progress: { threads: [7] } }, { merge: true }))
  })

  await denied(async function theLegacyDocumentIsNotPublic() {
    await assertFails(fsB.doc("weavers/" + UID).get())
  })

  /* ── F. The server is not blocked by any of the above ────────────────────────
     The whole reason `if false` is an acceptable answer here. Admin SDK writes
     bypass security rules, so refusing the client costs the product nothing —
     but only if that is actually true, which is worth asserting rather than
     assuming. Every document the client was just refused is written here through
     the trusted path, in the exact shape functions/index.js produces. */

  await allowed(async function theServerCanCreateTheAccount() {
    /* initializeAccount. Under users/, like every other account document. */
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await fs_(ctx)
        .doc(userDoc("weaver-admin"))
        .set({
          displayName: "By Server",
          email: "server@example.test",
          photoURL: null,
          memberSince: NOW,
          verified: false,
          badges: [],
          wishlist: {},
          redemptions: {},
          atharBase: 0,
          atharPeak: 0,
          updatedAt: NOW,
        })
    })
  })

  await allowed(async function theServerCanGrantARewardAndMoveTheBalance() {
    /* completeChallenge's transaction. */
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = fs_(ctx)
      await db
        .doc(sub("weaver-admin", "rewards", "t10_challenge_1"))
        .set({ ...R.reward, uniqueKey: "t10_challenge_1", earnedAt: NOW })
      await db
        .doc(userDoc("weaver-admin"))
        .set({ athar: 150, atharPeak: 150, updatedAt: NOW }, { merge: true })
    })
  })

  await allowed(async function theServerCanWriteProgressAndSecrets() {
    /* completeWaypoint and completeSecret. */
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = fs_(ctx)
      await db
        .doc(sub("weaver-admin", "progress", "t10_w3"))
        .set({ threadId: 10, waypointId: 3, completed: true, completedAt: NOW, metadata: {}, updatedAt: NOW })
      await db
        .doc(sub("weaver-admin", "secrets", "10_hidden-crack"))
        .set({ ...R.secret, updatedAt: NOW })
    })
  })

  await allowed(async function theServerCanImportAndLowerALegacyBase() {
    /* The atharBase migration, both directions — the case the old growsOnly()
       guard could not distinguish from an attack. */
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await fs_(ctx).doc(userDoc("weaver-admin")).set({ atharBase: 750, updatedAt: NOW }, { merge: true })
    })
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await fs_(ctx).doc(userDoc("weaver-admin")).set({ atharBase: 250, updatedAt: NOW }, { merge: true })
    })
    const snap = await fs_(testEnv.authenticatedContext("weaver-admin")).doc(userDoc("weaver-admin")).get()
    if (!snap.exists || snap.data().atharBase !== 250) {
      throw new Error("expected the stored atharBase to still be 250")
    }
  })

  await denied(async function butTheClientStillCannotAfterAllThat() {
    /* Prove the trusted path did not open anything. */
    await assertFails(
      fs_(testEnv.authenticatedContext("weaver-admin"))
        .doc(userDoc("weaver-admin"))
        .set({ athar: 999999, updatedAt: NOW }, { merge: true }),
    )
  })
}

try {
  await run()
} finally {
  await testEnv.cleanup()
}

console.log("")
console.log("  ALLOW PASS           " + allowPass)
console.log("  DENY PASS            " + denyPass)
console.log("  UNEXPECTED ALLOW     " + unexpectedAllow.length)
console.log("  UNEXPECTED DENY      " + unexpectedDeny.length)
console.log("  RULE EVALUATION ERROR " + evalErrors.length)

if (evalErrors.length) {
  console.log("\n  Rules that failed to evaluate — not a security pass:")
  for (const e of evalErrors) console.log("    EVAL  " + e)
}
if (unexpectedAllow.length) {
  console.log("\n  Writes that were allowed but had to be refused:")
  for (const u of unexpectedAllow) console.log("    ALLOW " + u)
}
if (unexpectedDeny.length) {
  console.log("\n  Writes that were refused but had to succeed:")
  for (const u of unexpectedDeny) console.log("    DENY  " + u)
}

const bad =
  evalErrors.length + unexpectedAllow.length + unexpectedDeny.length

if (bad) {
  console.log(
    "\nfirestore.rules: " +
      bad +
      " problem(s) across " +
      (allowPass + denyPass + bad) +
      " checks",
  )
  process.exit(1)
}
console.log("\nfirestore.rules: " + (allowPass + denyPass) + " checks passed")
