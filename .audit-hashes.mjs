/* Hash audit: is ma-an/ a byte-identical duplicate of maan/? And are the 11
   "skipped_duplicate_byte_files" really byte-identical to another file? */
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

const ROOT = "C:/Users/LENOVO/new-19"
const PLACES = path.join(ROOT, "assets/places")

const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex")

const byHash = new Map()
for (const gov of fs.readdirSync(PLACES)) {
  const dir = path.join(PLACES, gov)
  if (!fs.statSync(dir).isDirectory()) continue
  for (const name of fs.readdirSync(dir)) {
    const f = path.join(dir, name)
    if (!fs.statSync(f).isFile()) continue
    if (!/\.(png|jpe?g|webp|svg)$/i.test(name)) continue
    const h = sha(f)
    const rel = "assets/places/" + gov + "/" + name
    if (!byHash.has(h)) byHash.set(h, [])
    byHash.get(h).push(rel)
  }
}

console.log("=== 1. ma-an/ vs maan/ : same-stem cross-folder comparison ===")
const maan = fs.readdirSync(path.join(PLACES, "maan"))
const maan2 = fs.existsSync(path.join(PLACES, "ma-an")) ? fs.readdirSync(path.join(PLACES, "ma-an")) : []
let same = 0, diff = 0, onlyMaan = [], onlyMaAn = []
const maanSet = new Set(maan), maan2Set = new Set(maan2)
for (const n of maan) if (!maan2Set.has(n)) onlyMaan.push(n)
for (const n of maan2) if (!maanSet.has(n)) onlyMaAn.push(n)
for (const n of maan) {
  if (!maan2Set.has(n)) continue
  const a = path.join(PLACES, "maan", n), b = path.join(PLACES, "ma-an", n)
  const eq = sha(a) === sha(b)
  if (eq) same++
  else { diff++; console.log("  DIFFERENT BYTES: maan/" + n + "  vs  ma-an/" + n + "  (" + fs.statSync(a).size + " vs " + fs.statSync(b).size + " bytes)") }
}
console.log("  identical: " + same + " | different: " + diff)
console.log("  only in maan/ (" + onlyMaan.length + "): " + onlyMaan.join(", "))
console.log("  only in ma-an/ (" + onlyMaAn.length + "): " + onlyMaAn.join(", "))

console.log("\n=== 2. Every byte-identical group with >1 member (cross-folder dupes) ===")
let groups = 0
for (const [h, files] of [...byHash].sort((a, b) => b[1].length - a[1].length)) {
  if (files.length < 2) continue
  groups++
  console.log("  " + h.slice(0, 12) + " x" + files.length + ": " + files.join("  ==  "))
}
console.log("  groups: " + groups)

console.log("\n=== 3. photo-manifest skipped_duplicate_byte_files: is the claim true? ===")
const pm = JSON.parse(fs.readFileSync(path.join(PLACES, "photo-manifest.json"), "utf8"))
const skipped = pm.skipped_duplicate_byte_files || []
for (const rel of skipped) {
  const f = path.join(ROOT, rel)
  if (!fs.existsSync(f)) { console.log("  LISTED BUT ABSENT: " + rel); continue }
  const twins = (byHash.get(sha(f)) || []).filter((t) => t !== rel)
  console.log("  " + rel)
  console.log("      identical to: " + (twins.length ? twins.join(", ") : "NOTHING ELSE — the claim is false"))
}

console.log("\n=== 4. Which waypoints does js/data.js point at ma-an/ vs maan/ ? ===")
const src = fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8")
const refs = [...src.matchAll(/"(assets\/places\/[^"]+)"/g)].map((m) => m[1])
const counts = {}
for (const r of refs) {
  const m = r.match(/^assets\/places\/([^/]+)\//)
  if (!m) continue
  counts[m[1]] = (counts[m[1]] || 0) + 1
}
console.log("  references per governorate folder:")
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log("    " + String(v).padStart(3) + "  " + k + (k === "ma-an" ? "   <-- NON-CANONICAL SPELLING" : ""))

console.log("\n  the 11 ma-an/ references:")
for (const r of [...new Set(refs)].filter((x) => x.includes("/ma-an/")).sort()) console.log("    " + r)