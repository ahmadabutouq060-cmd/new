/* Naseej — firestore.rules conformance for the browser bundle.
 *
 * The rules are server-authoritative on purpose: rewards, progress and secrets are
 * written only by Cloud Functions, a client may touch exactly two fields on its
 * own user document, and mysteries are the one collection it owns outright.
 *
 * That policy is easy to state and easy to erode. js/firebase.js grew a
 * transaction that granted rewards and a sign-in path that pushed the whole
 * profile, both of which the rules denied — so both failed on every call, in
 * production, silently, because each returned a status the UI treated as a
 * routine no-op. Nothing in the build noticed, and the failure mode (a weaver
 * whose progress never leaves the tab) looks exactly like a quiet week.
 *
 * js/firebase.js no longer makes those writes. This script is what keeps it that
 * way, and it works by reading the source rather than by running it: it resolves
 * every Firestore write call in the file and fails if any of them names a path the
 * rules close. That runs in a second, needs no emulator, and — unlike a mocked
 * Firestore — cannot be satisfied by a code path that is never taken.
 *
 * It deliberately does not try to be a security proof. It proves the invariant
 * that matters most and is easiest to break by accident: no client-side write
 * reaches a server-owned collection.
 *
 *   node scripts/check-client-write-policy.mjs
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/* Kept in step with firestore.rules by hand. If a rule changes, change it here
   too — a stale copy of the policy would pass this script against a rules file
   that no longer says the same thing. */
const POLICY = {
  /* collections/{coll} paths a browser may write, and the subcollections they
     may contain. Anything not listed is closed. */
  writable: ["users/{uid}/mysteries"],
  /* The complete set of fields a client may set on users/{uid}. */
  userFields: ["wishlist", "updatedAt"],
  /* Written only by Cloud Functions. */
  serverOwned: ["users/{uid}/rewards", "users/{uid}/progress", "users/{uid}/secrets"],
  /* Never writable by anyone at the browser, server or otherwise. */
  readOnly: ["weavers"],
  /* Fields on users/{uid} owned by the server. */
  serverFields: [
    "displayName",
    "email",
    "photoURL",
    "memberSince",
    "verified",
    "badges",
    "redemptions",
    "atharBase",
    "athar",
    "atharPeak",
  ],
}

const problems = []
const notes = []

function readSource(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8")
}

/* ── 1. Every Firestore write call in js/firebase.js ────────────────────────────
   The bundle talks to Firestore through a thin adapter (bundle.firestore.setDoc,
   .addDoc, .updateDoc, .deleteDoc, .setDoc on a FieldPath, and
   .runTransaction). Each takes the target path as its first or second argument,
   so we find the call, then look at how that argument is built. */

const source = readSource("js/firebase.js")

/* Strip comments so a path named in prose is not mistaken for a path written. */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length))

/* The helpers that build a document path. subCollection(bundle, uid, name, id)
   and subRef(bundle, uid, name, id) both produce users/{uid}/{name}/{id};
   userRef(bundle, uid) produces users/{uid}. */

const WRITE_VERBS = "setDoc|addDoc|updateDoc|deleteDoc|set"

/* js/firebase.js does not always write through `bundle.firestore` — syncAccount
   aliases it to a local `const fs = bundleRef.firestore` first. Resolve every
   alias of .firestore up front, or the one write that goes through `fs` is
   exactly the one this script fails to look at. */
const FIRESTORE_HOLDERS = new Set(["bundle", "bundleRef"])
for (const alias of code.matchAll(
  /(?:const|let|var)\s+(\w+)\s*=\s*(?:bundle|bundleRef)\.firestore\b/g,
)) {
  FIRESTORE_HOLDERS.add(alias[1])
}

/* Both spellings occur: `bundle.firestore.setDoc(...)` directly, and
   `fs.setDoc(...)` through the alias. */
const CALL_RE = new RegExp(
  `\\b(${[...FIRESTORE_HOLDERS].join("|")})\\s*(?:\\.\\s*firestore)?\\s*\\.\\s*(${WRITE_VERBS})\\s*\\(`,
  "g",
)

function collectionArgAt(src, openParenIndex) {
  /* Walk to the argument list and pull the first argument, which is the path. */
  let depth = 0
  let i = openParenIndex
  let start = -1
  let end = -1
  for (; i < src.length; i++) {
    const c = src[i]
    if (c === "(") {
      depth++
      if (depth === 1) {
        start = i + 1
        continue
      }
    } else if (c === ")") {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    } else if (c === "," && depth === 1 && end === -1) {
      break
    }
  }
  if (start === -1) return ""
  return src.slice(start, end === -1 ? i : end).trim()
}

const lineOf = (index) => source.slice(0, index).split("\n").length

let calls = 0
let m
CALL_RE.lastIndex = 0
while ((m = CALL_RE.exec(code)) !== null) {
  const [, holder, verb] = m
  const open = m.index + m[0].length - 1
  const arg = collectionArgAt(code, open)
  calls++

  const line = lineOf(m.index)

  /* Classify the target. Anything that is not obviously the allowed wishlist
     write is reported, because "I could not tell" must not mean "fine". */
  const normalized = arg.replace(/\s+/g, " ")

  const isUserDoc =
    /userRef\s*\(/.test(normalized) || /"users"\s*,\s*String\s*\(\s*uid\s*\)/.test(normalized)

  if (/sub(Collection|Ref)\s*\(/.test(normalized)) {
    const names = [...normalized.matchAll(/"([a-z]+)"\s*,/g)].map((x) => x[1])
    const coll = names.find((n) => n !== "users")
    notes.push(`line ${line}: ${verb} to users/{uid}/${coll}/... `)
    if (coll && !POLICY.writable.some((p) => p.includes(`/${coll}`))) {
      problems.push(
        `line ${line}: ${verb} writes users/{uid}/${coll}/…, which firestore.rules closes. ` +
          `A browser may only write ${POLICY.writable.join(", ")}.`,
      )
    }
    continue
  }

  if (isUserDoc) {
    /* Allowed, but only if the payload is limited to the permitted fields. The
       payload is the second argument; find it in the same call. */
    const payloadStart = open + 1
    let depth = 0
    let i = payloadStart - 1
    let second = ""
    let seenComma = false
    for (; i < code.length; i++) {
      const c = code[i]
      if (c === "(") depth++
      else if (c === ")") {
        depth--
        if (depth === 0) break
      } else if (c === "," && depth === 1 && !seenComma) {
        seenComma = true
        second = code.slice(i + 1)
        break
      }
    }
    /* Cut the payload at the matching close paren so later arguments do not
       leak field names into this check. */
    let d = 0
    let payload = ""
    for (const c of second) {
      if (c === "(" || c === "[" || c === "{") d++
      else if (c === ")" || c === "]" || c === "}") {
        if (d === 0) break
        d--
      }
      payload += c
    }

    const forbidden = POLICY.serverFields.filter((f) =>
      new RegExp(`(^|[^\\w])${f}\\s*:`).test(payload),
    )

    if (forbidden.length) {
      problems.push(
        `line ${line}: ${verb} sets ${forbidden.join(", ")} on users/{uid}. ` +
          `Those fields are server-owned; a client update may only touch ` +
          `${POLICY.userFields.join(" and ")}.`,
      )
    } else {
      notes.push(`line ${line}: ${verb} to users/{uid} — permitted fields only`)
    }
    continue
  }

  /* A path built some other way, or a raw collection() write. */
  if (/"weavers"/.test(normalized)) {
    problems.push(`line ${line}: ${verb} writes the weavers collection, which is read-only.`)
    continue
  }

  problems.push(
    `line ${line}: ${verb} target could not be resolved statically (${normalized.slice(0, 80)}). ` +
      `Confirm by hand that it is one of: ${POLICY.writable.join(", ")}.`,
  )
}

/* ── 2. No direct transaction against a reward ─────────────────────────────────
   The old awardAthar granted rewards with runTransaction, which writes the reward
   and the balance in one go. Assert the call is gone rather than trusting that
   subCollection() was the only way to reach one. */
if (/\.runTransaction\s*\(/.test(code)) {
  problems.push(
    "js/firebase.js calls runTransaction. Rewards are granted in a transaction by " +
      "functions/index.js; a client-side one would write a server-owned document.",
  )
}

/* ── 3. The helper names that made the violations ──────────────────────────────
   Not structural, but worth a hard failure: these are the functions that were
   rewritten, and if one is reintroduced with its old body the answer is a
   permission-denied at runtime, not a test failure. */
const RETIRED = [
  { name: "saveSecretCompletion", rule: "server-owned" },
  { name: "writeProgressRow", rule: "server-owned" },
  { name: "awardAthar", rule: "server-owned" },
]
for (const r of RETIRED) {
  const re = new RegExp(`function\\s+${r.name}\\s*\\(`)
  const at = code.search(re)
  if (at === -1) continue
  const body = code.slice(at, code.indexOf("\n  }", at))
  if (/\b(firestore|setDoc|runTransaction)\b/.test(body.replace(/^\s*function[^\n]*/, ""))) {
    problems.push(
      `${r.name}() touches Firestore directly. The documents it used to write are ` +
        `${r.rule}; it must delegate to the matching Cloud Function.`,
    )
  } else {
    notes.push(`${r.name}() delegates to Cloud Functions`)
  }
}

/* ── report ───────────────────────────────────────────────────────────────────── */

console.log("── client write policy ──────────────────────────────────────")
console.log(`   scanned ${calls} Firestore write call(s) in js/firebase.js`)
console.log(`   firestore handles: ${[...FIRESTORE_HOLDERS].join(", ")}`)
console.log("")
for (const n of notes) console.log(`   ok   ${n}`)
console.log("")
if (problems.length) {
  console.error("── FAILED ───────────────────────────────────────────────────")
  for (const p of problems) console.error(`   ${p}`)
  console.error(`\n${problems.length} violation(s) of firestore.rules.`)
  process.exit(1)
}
console.log("client write policy clean")