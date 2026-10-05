/* TEMPORARY diagnostic. Delete before finishing. */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const testEnv = await initializeTestEnvironment({
  projectId: "demo-naseej",
  firestore: {
    host: "127.0.0.1",
    port: 8188,
    rules: fs.readFileSync(path.join(ROOT, "firestore.rules"), "utf8"),
  },
})
const now = Date.now()

async function t(label, path, data, merge) {
  const db = testEnv.authenticatedContext("probe-" + Math.random().toString(36).slice(2, 8)).firestore()
  try {
    await assertSucceeds(db.doc(path).set(data, merge ? { merge: true } : undefined))
    console.log("ALLOW  " + label)
  } catch (e) {
    console.log("DENY   " + label + " :: " + String(e.message).replace(/\s+/g, " ").slice(0, 130))
  }
}

console.log("--- progress id / threadId agreement ---")
const pbase = (tid, wid) => ({
  threadId: tid, waypointId: wid, completed: true, completedAt: now,
  metadata: {}, updatedAt: now,
})
for (const [id, tid] of [["t10_w1", 10], ["t10_progress", 10], ["t10_final", 10], ["t99_w1", 99], ["t10_w1", 99]]) {
  await t(`progress id=${id} threadId=${tid}`, `users/p1/progress/${id}`, pbase(tid, 1))
}

console.log("--- profile monotonic guards, one field each ---")
const prof = (over) => ({
  displayName: "D", email: "", photoURL: "", memberSince: null,
  verified: false, badges: ["b1"], wishlist: {}, redemptions: {},
  atharBase: 740, athar: 740, atharPeak: 740, updatedAt: now, ...over,
})

// each on its own fresh account so there is no ordering effect
await t("profile create baseline", "users/pg0", prof({}))
await t("guard growsOnly('athar') merge", "users/pg1", prof({}))
await t("  -> merge athar up", "users/pg1", { athar: 900, updatedAt: now }, true)
await t("guard growsOnlyList('badges') merge", "users/pg2", prof({}))
await t("  -> merge badges append", "users/pg2", { badges: ["b1", "b2"], updatedAt: now }, true)
await t("  -> merge badges shrink", "users/pg2", { badges: [], updatedAt: now }, true)
await t("guard appendOnlyMap('redemptions') merge", "users/pg3", prof({}))
await t("  -> merge redemptions append", "users/pg3", { redemptions: { a: { at: now, cost: 1 } }, updatedAt: now }, true)
await t("  -> merge redemptions remove", "users/pg3", { redemptions: {}, updatedAt: now }, true)
await t("guard: create with non-empty redemptions", "users/pg4", prof({ redemptions: { a: { at: now, cost: 1 } } }))
await t("  -> merge another redemption", "users/pg4", { redemptions: { a: { at: now, cost: 1 }, b: { at: now, cost: 2 } }, updatedAt: now }, true)
await t("guard: flat (non-nested) redemption values", "users/pg5", prof({}))
await t("  -> merge flat redemptions", "users/pg5", { redemptions: { a: 1 }, updatedAt: now }, true)