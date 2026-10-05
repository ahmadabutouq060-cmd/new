/* Naseej — frontend <-> Cloud Functions contract, and the Firestore writes the
 * trusted tier is supposed to make.
 *
 * firestore.rules is server-authoritative: a client may not create its own user
 * document and may not write rewards, progress or secrets at all. That makes
 * functions/index.js the only writer of those documents, and it makes the shape
 * of what it writes load-bearing — a callable that derives the wrong document id
 * writes somewhere the rules and the reads will never look, and nothing in CI
 * notices.
 *
 * So this file checks the two things that can silently rot:
 *
 *   1. The validation tables in functions/lib/*.js still cover the real content
 *      in js/data.js, and still agree with it. Those tables are hand-copied, and
 *      the hero thread has four interactive waypoints of which three used to be
 *      listed; a missing entry is a weaver who solves a puzzle and is paid
 *      nothing, with no error anywhere.
 *
 *   2. Every callable the browser can reach exists on the backend, and each one
 *      writes to the document path and id the rest of the system reads from.
 *
 * The callables are invoked with a stubbed firebase-admin that records writes, so
 * this needs neither the Functions emulator nor credentials. It is a plain Node
 * script like test-firestore-rules.mjs, and it exits non-zero on any failure.
 *
 *   node scripts/test-functions-contract.mjs
 */

import Module, { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/* The backend is CommonJS (firebase-functions v1 requires it) and the test is an
   ES module because of the top-level await. createRequire bridges the two. */
const require = createRequire(import.meta.url)

const failures = []
const passed = []

function check(name, fn) {
  try {
    const r = fn()
    if (r === false) throw new Error("assertion returned false")
    passed.push(name)
  } catch (err) {
    failures.push(`${name} — ${err.message}`)
  }
}

function eq(actual, expected, what) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(`${what || "value"}: got ${a}, expected ${e}`)
}

/* ── 1. Load the real content out of js/data.js ─────────────────────────────── */

function loadData() {
  const noop = () => {}
  const element = () => ({
    style: {},
    dataset: {},
    textContent: "",
    innerHTML: "",
    children: [],
    childNodes: [],
    classList: { add: noop, remove: noop, contains: () => false },
    setAttribute: noop,
    getAttribute: () => null,
    addEventListener: noop,
    remove: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: noop,
  })
  const document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: element,
    addEventListener: noop,
    body: element(),
    documentElement: element(),
  }
  const store = new Map()
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
  const window = {
    localStorage,
    sessionStorage: localStorage,
    document,
    location: { hash: "", search: "", pathname: "/" },
    matchMedia: () => ({ matches: false }),
    addEventListener: noop,
    navigator: { userAgent: "node", onLine: true },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    console,
  }
  Object.assign(globalThis, { window, document, localStorage })
  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true,
    writable: true,
  })
  const file = path.join(ROOT, "js", "data.js")
  new vm.Script(fs.readFileSync(file, "utf8"), { filename: file }).runInThisContext()
  return window.NASEEJ.data
}

const data = loadData()

/* Every interactive waypoint in the product, with the answer the client accepts.
   This is what the trusted tier has to agree with. */
function realInteractions() {
  const out = []
  for (const summary of data.libraryThreads || []) {
    const thread = data.getThread(summary.id)
    if (!thread) continue
    for (const wp of thread.waypoints || []) {
      if (wp.interaction !== "challenge" && wp.interaction !== "observation") continue
      const body = wp.interaction === "challenge" ? wp.quiz : wp.observation
      if (!body) continue
      out.push({
        threadId: thread.id,
        waypointId: wp.id,
        challengeId: `t${thread.id}_w${wp.id}`,
        type: wp.interaction,
        correct: String(body.correct),
        options: (body.options || []).map((o) => o.id),
      })
    }
  }
  return out
}

function realSecrets() {
  const out = []
  for (const summary of data.libraryThreads || []) {
    const thread = data.getThread(summary.id)
    if (!thread || !thread.secretChallenge) continue
    const s = thread.secretChallenge
    const quiz = s.quiz || {}
    out.push({
      threadId: thread.id,
      secretId: s.id,
      correct: String(quiz.correct),
      options: (quiz.options || []).map((o) => o.id),
    })
  }
  return out
}

/* ── 2. Load the backend with a recording stub in place of firebase-admin ────
   The stub records every set()/get() so the test can assert on paths without a
   database. `exists:false` is the default, which is the first-call case. */

const writes = []
const reads = []
let existing = new Map()

function makeAdmin() {
  const stamp = { serverTimestamp: () => "__SERVER_TS__" }
  const pathRef = (segments) => {
    const p = segments.join("/")
    return {
      path: p,
      collection: (name) => pathRef([...segments, name]),
      doc: (name) => pathRef([...segments, name]),
      get: async () => {
        reads.push(p)
        return { exists: existing.has(p), data: () => existing.get(p) }
      },
      set: async (data, options) => {
        writes.push({ path: p, data, options })
        existing.set(p, { ...(existing.get(p) || {}), ...data })
      },
    }
  }
  const db = {
    collection: (name) => pathRef([name]),
    runTransaction: async (fn) =>
      fn({
        get: async (ref) => {
          reads.push(ref.path)
          return { exists: existing.has(ref.path), data: () => existing.get(ref.path) }
        },
        set: (ref, data, options) => {
          writes.push({ path: ref.path, data, options })
          existing.set(ref.path, { ...(existing.get(ref.path) || {}), ...data })
        },
      }),
  }
  return {
    apps: [{ name: "stub" }],
    initializeApp() {},
    firestore: Object.assign(() => db, { FieldValue: stamp }),
  }
}

const realLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === "firebase-admin") return makeAdmin()
  return realLoad.call(this, request, parent, isMain)
}
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8188"
process.env.GCLOUD_PROJECT = "demo-naseej"

const backend = require(path.join(ROOT, "functions", "index.js"))
const { validateChallenge } = require(path.join(ROOT, "functions", "lib", "validation.js"))
const { validateSecret } = require(path.join(ROOT, "functions", "lib", "secrets.js"))

Module._load = realLoad

const AUTH = { auth: { uid: "weaver-a" } }
const ANON = { auth: null }

const pathsOf = () => writes.map((w) => w.path)
const lastWrite = (needle) => [...writes].reverse().find((w) => w.path.includes(needle))

/* ── 3. The contract table ────────────────────────────────────────────────────
   js/firebase.js builds exactly these httpsCallable handles; anything it names
   that the backend does not export is a call that fails at runtime with
   "function not found" and surfaces to a weaver as a failed save. */

const frontendCallables = [
  { name: "completeChallenge", calledFrom: "js/data.js answerHeroQuestion" },
  { name: "completeSecret", calledFrom: "js/data.js answerSecretChallenge" },
  { name: "initializeAccount", calledFrom: "js/auth.js attachAccount" },
]

console.log("── contract table ────────────────────────────────────────────")
for (const c of frontendCallables) {
  const exported = typeof backend[c.name] === "function"
  console.log(
    `  ${exported ? "ok  " : "FAIL"} frontend calls ${c.name.padEnd(20)} backend ${exported ? "exports it" : "DOES NOT EXPORT IT"}   (${c.calledFrom})`,
  )
  if (!exported) failures.push(`frontend calls ${c.name}, which the backend does not export`)
  else passed.push(`${c.name} is exported`)
}
for (const name of Object.keys(backend)) {
  const known = frontendCallables.some((c) => c.name === name)
  console.log(
    known
      ? `    backend exports ${name} — called by the frontend`
      : `  note backend also exports ${name} — nothing in js/firebase.js calls it`,
  )
}

console.log("")
console.log("── validation tables vs js/data.js ──────────────────────────")

const interactions = realInteractions()
const secrets = realSecrets()

check("the hero thread has interactive waypoints to validate", () => {
  if (interactions.length === 0) throw new Error("found none — data.js changed shape?")
})
check("the hero thread has a secret challenge to validate", () => {
  if (secrets.length === 0) throw new Error("found none — data.js changed shape?")
})

for (const it of interactions) {
  check(
    `challenge ${it.challengeId} (${it.correct}) validates`,
    () => {
      const good = validateChallenge({
        threadId: it.threadId,
        waypointId: it.waypointId,
        challengeId: it.challengeId,
        answer: it.correct,
      })
      if (!good.ok) throw new Error(`correct answer rejected: ${good.reason}`)
      const bad = validateChallenge({
        threadId: it.threadId,
        waypointId: it.waypointId,
        challengeId: it.challengeId,
        answer: "definitely-not-the-answer",
      })
      if (bad.ok) throw new Error("a wrong answer was accepted")
      /* A missing entry in the table fails closed, which is safe but silent:
         the weaver solves the puzzle and is paid nothing. */
      const wrongThread = validateChallenge({
        threadId: it.threadId + 1,
        waypointId: it.waypointId,
        answer: it.correct,
      })
      if (wrongThread.ok) throw new Error("accepted a challenge from another thread")
    },
  )
}

for (const s of secrets) {
  check(`secret ${s.threadId}_${s.secretId} (${s.correct}) validates`, () => {
    const good = validateSecret({
      threadId: s.threadId,
      secretId: s.secretId,
      optionId: s.correct,
    })
    if (!good.ok) throw new Error(`correct answer rejected: ${good.reason}`)
    const bad = validateSecret({
      threadId: s.threadId,
      secretId: s.secretId,
      optionId: "wrong",
    })
    if (bad.ok) throw new Error("a wrong answer was accepted")
  })
}

/* ── 4. Document ids the rest of the system reads from ────────────────────────
   progressRows() in js/data.js decides the id; completeWaypoint has to agree or
   every server write lands beside the client's row instead of on it. */

console.log("")
console.log("── callable document paths ──────────────────────────────────")

async function run(name, fn) {
  try {
    await fn()
    passed.push(name)
  } catch (err) {
    failures.push(`${name} — ${err.message}`)
  }
}

/* Sequential, not Promise.all: each check resets and reads the shared write
   recorder, so running them concurrently would let one check see another's
   writes and fail for the wrong reason. */
await run("initializeAccount creates the user document without a balance", async () => {
  writes.length = 0
  existing = new Map()
  const res = await backend.initializeAccount.run(
    {
      displayName: "A Weaver",
      email: "a@example.com",
      photoURL: "https://x/i.png",
      /* The fields firestore.rules forbids a client writing. If the callable
         echoed any of these, the rules would be the only thing standing between
         a weaver and an invented balance. */
      athar: 500000,
      atharPeak: 500000,
      verified: true,
      badges: ["everything"],
      rewards: { forged: true },
    },
    AUTH,
  )
  eq(res.status, "success", "initializeAccount status")
  const w = lastWrite("users/weaver-a")
  if (!w) throw new Error("initializeAccount wrote no user document")
  eq(w.data.atharBase, 0, "atharBase seeded")
  eq(w.data.atharPeak, 0, "atharPeak seeded")
  eq(w.data.verified, false, "verified")
  eq(w.data.badges, [], "badges")
  if ("rewards" in w.data) throw new Error("the user document carries an embedded rewards map")
  if (w.data.athar === 500000 || w.data.atharPeak === 500000) {
    throw new Error("initializeAccount echoed a client-supplied balance")
  }
  eq(res.created, true, "initializeAccount created")

  /* Second call must not clobber, and must not re-report creation. */
  writes.length = 0
  const again = await backend.initializeAccount.run(
    { displayName: "Renamed", email: "b@example.com" },
    AUTH,
  )
  eq(again.created, false, "initializeAccount second call created")
  if (writes.some((x) => x.data.athar !== undefined || x.data.atharPeak !== undefined)) {
    throw new Error("initializeAccount second call touched a balance")
  }
})

await run("completeChallenge accepts the client's optionId field", async () => {
  writes.length = 0
  existing = new Map([["users/weaver-a", { athar: 0, atharPeak: 0 }]])
  const res = await backend.completeChallenge.run(
    { threadId: 10, waypointId: 1, optionId: "ibex" },
    AUTH,
  )
  eq(res.status, "success", "completeChallenge status with optionId")
  eq(res.awarded, true, "completeChallenge awarded")
  const reward = lastWrite("/rewards/")
  if (!reward) throw new Error("no reward document written")
  if (reward.path !== "users/weaver-a/rewards/t10_challenge_1") {
    throw new Error(`reward at ${reward.path}, expected users/weaver-a/rewards/t10_challenge_1`)
  }
  if (reward.data.amount !== 150) {
    throw new Error(`reward amount ${reward.data.amount}, expected 150`)
  }
})

await run("completeChallenge rejects a wrong answer without writing", async () => {
  writes.length = 0
  existing = new Map([["users/weaver-a", { athar: 0, atharPeak: 0 }]])
  const res = await backend.completeChallenge.run(
    { threadId: 10, waypointId: 1, optionId: "anchor" },
    AUTH,
  )
  eq(res.status, "denied", "completeChallenge with a wrong answer")
  if (pathsOf().some((p) => p.includes("/rewards/"))) {
    throw new Error("a wrong answer still wrote a reward")
  }
})

await run("completeChallenge pays once for a repeated answer", async () => {
  /* Idempotency: the reward document id is the unique key, so a second call finds
     it and pays nothing. This is the property that stops a refresh, or a second
     device, from paying twice for one puzzle. */
  writes.length = 0
  existing = new Map([
    ["users/weaver-a", { athar: 150, atharPeak: 150 }],
    ["users/weaver-a/rewards/t10_challenge_1", { uniqueKey: "t10_challenge_1" }],
  ])
  const res = await backend.completeChallenge.run(
    { threadId: 10, waypointId: 1, optionId: "ibex" },
    AUTH,
  )
  eq(res.awarded, false, "completeChallenge awarded twice")
  eq(res.reason, "already", "completeChallenge duplicate reason")
})

await run("completeWaypoint writes progress/t{thread}_w{waypoint}", async () => {
  writes.length = 0
  existing = new Map()
  await backend.completeWaypoint.run({ threadId: 10, waypointId: 2 }, AUTH)
  const p = lastWrite("/progress/")
  if (!p) throw new Error("no progress document written")
  if (p.path !== "users/weaver-a/progress/t10_w2") {
    throw new Error(`progress at ${p.path}, expected users/weaver-a/progress/t10_w2`)
  }
})

await run("completeWaypoint writes progress/t{thread}_progress for a thread-level row", async () => {
  /* A thread-level row has no waypoint id; Number(undefined) is NaN and NaN is not
     null, so this is where a missing waypointId used to land on 'w0'. */
  writes.length = 0
  existing = new Map()
  await backend.completeWaypoint.run({ threadId: 10 }, AUTH)
  const p = lastWrite("/progress/")
  if (!p) throw new Error("no progress document written")
  if (p.path !== "users/weaver-a/progress/t10_progress") {
    throw new Error(`progress at ${p.path}, expected users/weaver-a/progress/t10_progress`)
  }
})

await run("completeSecret writes secrets/{thread}_{secret}", async () => {
  writes.length = 0
  existing = new Map([["users/weaver-a", { athar: 0, atharPeak: 0 }]])
  const res = await backend.completeSecret.run({ threadId: 10, optionId: "herb-wrap" }, AUTH)
  eq(res.status, "success", "completeSecret status")
  eq(res.awarded, true, "completeSecret awarded")
  const secret = lastWrite("/secrets/")
  if (!secret) throw new Error("no secret document written")
  if (secret.path !== "users/weaver-a/secrets/10_hidden-crack") {
    throw new Error(`secret at ${secret.path}, expected users/weaver-a/secrets/10_hidden-crack`)
  }
})

await run("every callable refuses an unauthenticated caller and writes nothing", async () => {
  /* An https.onCall with no context.auth would otherwise write to whichever uid
     it invented, and the rules cannot help: Admin writes bypass them. */
  for (const name of [
    "completeChallenge",
    "completeWaypoint",
    "completeSecret",
    "initializeAccount",
  ]) {
    writes.length = 0
    existing = new Map()
    let threw = false
    try {
      await backend[name].run({}, ANON)
    } catch (err) {
      threw = true
      if (!/authentication required/i.test(err.message || "")) {
        throw new Error(`${name} threw the wrong error: ${err.message}`)
      }
    }
    if (!threw) throw new Error(`${name} accepted an unauthenticated caller`)
    if (writes.length) throw new Error(`${name} wrote while unauthenticated`)
  }
})

await run("saveMysteryState does not crash", async () => {
  writes.length = 0
  existing = new Map([["users/weaver-a/mysteries/10", { athar: 42, reveal: false }]])
  await backend.saveMysteryState.run(
    { threadId: 10, state: { progressPercent: 100 } },
    AUTH,
  )
  const m = lastWrite("/mysteries/")
  if (!m) throw new Error("no mystery document written")
  /* athar must be preserved from the stored value, not taken from state. */
  if (m.data.athar !== 42) {
    throw new Error(`saveMysteryState overwrote athar: got ${m.data.athar}, wanted 42`)
  }
})

await run("completeWaypoint rejects an unknown threadId", async () => {
  writes.length = 0
  existing = new Map()
  const res = await backend.completeWaypoint.run({ threadId: 9999, waypointId: 1 }, AUTH)
  if (res.status !== 'invalid_thread') {
    throw new Error(`expected invalid_thread, got: ${JSON.stringify(res)}`)
  }
  if (writes.length) throw new Error("completeWaypoint wrote despite unknown threadId")
})

await run("completeWaypoint rejects a waypointId not in that thread", async () => {
  /* Thread 10 has waypoints 1-4.  Waypoint 99 does not exist. */
  writes.length = 0
  existing = new Map()
  const res = await backend.completeWaypoint.run({ threadId: 10, waypointId: 99 }, AUTH)
  if (res.status !== 'invalid_waypoint') {
    throw new Error(`expected invalid_waypoint, got: ${JSON.stringify(res)}`)
  }
  if (writes.length) throw new Error("completeWaypoint wrote despite unknown waypointId")
})

await run("chooseMysteryBranch rejects an invalid branchId", async () => {
  writes.length = 0
  existing = new Map()
  const res = await backend.chooseMysteryBranch.run(
    { threadId: 10, branchId: 'north' },
    AUTH,
  )
  if (res.status !== 'error' || res.reason !== 'invalid_branch') {
    throw new Error(`expected error/invalid_branch, got: ${JSON.stringify(res)}`)
  }
  if (writes.length) throw new Error("chooseMysteryBranch wrote despite invalid branchId")
})

await run("chooseMysteryBranch accepts a valid branchId", async () => {
  writes.length = 0
  existing = new Map()
  const res = await backend.chooseMysteryBranch.run(
    { threadId: 10, branchId: 'person' },
    AUTH,
  )
  if (res.status !== 'success' || res.branch !== 'person') {
    throw new Error(`chooseMysteryBranch rejected a valid branch: ${JSON.stringify(res)}`)
  }
  const m = lastWrite("/mysteries/")
  if (!m) throw new Error("chooseMysteryBranch wrote no mystery document")
  if (m.data.choices && m.data.choices.branch !== 'person') {
    throw new Error(`wrong branch in mystery doc: ${JSON.stringify(m.data.choices)}`)
  }
})

console.log("")
for (const name of [
  "initializeAccount creates the user document without a balance",
  "initializeAccount is idempotent",
  "completeChallenge accepts the client's optionId field",
  "completeChallenge rejects a wrong answer without writing",
  "completeChallenge pays once for a repeated answer",
  "completeWaypoint writes progress/t{thread}_w{waypoint}",
  "completeWaypoint writes progress/t{thread}_progress for a thread-level row",
  "completeSecret writes secrets/{thread}_{secret}",
  "every callable refuses an unauthenticated caller and writes nothing",
  "saveMysteryState does not crash",
  "completeWaypoint rejects an unknown threadId",
  "completeWaypoint rejects a waypointId not in that thread",
  "chooseMysteryBranch rejects an invalid branchId",
  "chooseMysteryBranch accepts a valid branchId",
]) {
  const ok = failures.some((f) => f.startsWith(name)) ? "FAIL" : "ok  "
  console.log(`  ${ok} ${name}`)
}

console.log("")
console.log(`  ${passed.length} check(s) passed`)
if (failures.length) {
  console.error("── FAILED ───────────────────────────────────────────────────")
  for (const f of failures) console.error("  " + f)
  console.error(`\n${failures.length} problem(s).`)
  process.exit(1)
}
console.log("functions contract verified")
