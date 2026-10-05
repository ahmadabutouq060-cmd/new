/* Ground truth: among image paths that js/data.js actually references, which
   are byte-identical to each other? Those are the places where the UI asserts
   "Photograph of <place>" for a picture that is not of that place. */
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

const ROOT = "C:/Users/LENOVO/new-19"
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex")

/* every assets/ path the source references */
const refs = new Set()
for (const rel of ["index.html", "js/data.js", "js/navigation.js", "js/pages.js", "js/firebase.js", "js/auth.js", "js/app.js"]) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8")
  for (const m of src.matchAll(/["'(](assets\/[^"')]+)["')]/g)) refs.add(m[1])
}

/* what data.js says the image is, per waypoint */
const src = fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8")
const waypointImages = []
{
  const re = /id:\s*(\d+),\s*name:\s*(["'])([^"']+)\2[\s\S]*?\n\s*image:\s*"([^"]+)"(?:,\s*\n\s*imageStatus:\s*"([^"]+)")?/g
  let m
  while ((m = re.exec(src))) waypointImages.push({ id: m[1], name: m[3], image: m[4], status: m[5] || "(none)" })
}

const byHash = new Map()
for (const r of refs) {
  const abs = path.join(ROOT, r)
  if (!fs.existsSync(abs)) continue
  const h = sha(abs)
  if (!byHash.has(h)) byHash.set(h, [])
  byHash.get(h).push(r)
}

console.log("referenced waypoint image entries in data.js:", waypointImages.length)

const badGroups = []
for (const [h, files] of byHash) {
  if (files.length < 2) continue
  /* only a problem if two DIFFERENT place names claim the same bytes */
  const claims = waypointImages.filter((w) => files.includes(w.image))
  const names = new Set(claims.map((c) => c.name))
  if (names.size < 2) continue
  badGroups.push({ h, files, claims })
}

console.log("\n=== SAME PHOTOGRAPH CLAIMED AS A PHOTO OF DIFFERENT PLACES ===")
let affected = 0
for (const g of badGroups) {
  const dupClaims = g.claims.filter((c, i, arr) => arr.findIndex((x) => x.image === c.image) === i)
  affected += dupClaims.length - 1
  console.log("\n  bytes " + g.h.slice(0, 12) + "  (" + g.files.length + " files on disk)")
  for (const c of dupClaims)
    console.log("    " + String(c.image).padEnd(58) + " imageStatus=" + String(c.status).padEnd(13) + " place=" + JSON.stringify(c.name))
}
console.log("\n  groups: " + badGroups.length + " | waypoint entries showing a photo that is not unique to them: " + affected)

console.log("\n=== manifest output folder distribution (docs/naseej-place-image-manifest.json) ===")
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/naseej-place-image-manifest.json"), "utf8"))
const folders = {}
let nonCanon = []
for (const p of doc.places || []) {
  if (typeof p.output !== "string") continue
  const m = p.output.match(/^assets\/places\/([^/]+)\//)
  if (!m) continue
  folders[m[1]] = (folders[m[1]] || 0) + 1
  if (m[1] === "ma-an") nonCanon.push({ place: p.place, output: p.output, status: p.status, match: p.match_level, review: p.review_required })
}
for (const [k, v] of Object.entries(folders).sort((a, b) => b[1] - a[1])) console.log("  " + String(v).padStart(3) + "  " + k + (k === "ma-an" ? "   <-- NON-CANONICAL" : ""))
console.log("\n  ma-an/ entries in that manifest: " + nonCanon.length)
for (const n of nonCanon) console.log("    " + n.output.padEnd(58) + " status=" + n.status + " match=" + n.match + " review=" + n.review)

console.log("\n=== match_level breakdown of the 112 manifest places ===")
const ml = {}
for (const p of doc.places || []) ml[p.match_level] = (ml[p.match_level] || 0) + 1
console.log("  " + JSON.stringify(ml))
const passes = (doc.places || []).filter((p) => p.status === "downloaded" && !p.review_required && p.match_level === "exact_or_strong")
console.log("  entries passing the wire-waypoint filter (downloaded && !review_required && exact_or_strong): " + passes.length)

console.log("\n=== commons manifest folder distribution ===")
const cm = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/naseej-commons-image-manifest.json"), "utf8"))
const cf = {}
for (const r of cm.results || []) {
  if (r.status !== "DOWNLOADED" || !r.photo_path) continue
  const m = r.photo_path.match(/^assets\/places\/([^/]+)\//)
  if (m) cf[m[1]] = (cf[m[1]] || 0) + 1
}
for (const [k, v] of Object.entries(cf).sort((a, b) => b[1] - a[1])) console.log("  " + String(v).padStart(3) + "  " + k + (k === "ma-an" ? "   <-- NON-CANONICAL" : ""))