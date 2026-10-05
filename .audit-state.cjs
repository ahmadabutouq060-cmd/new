"use strict"
/* Temporary audit: enumerate every waypoint + thread cover js/data.js actually
   resolves to, group raster assignments by sha256, and report places whose
   "photograph" bytes are shared with a differently-named file. */
const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")
const vm = require("node:vm")

const ROOT = __dirname
const DATA = path.join(ROOT, "js", "data.js")
const src = fs.readFileSync(DATA, "utf8")
const sandbox = { window: { NASEEJ: {} } }
vm.runInNewContext(src, sandbox, { filename: "js/data.js" })
const data = sandbox.window.NASEEJ.data

const rows = []
const library = (data.libraryThreads || []).map((t) => ({
  id: t.id,
  title: t.title,
  city: t.city,
  image: t.image || null,
  status: t.imageStatus || "(none)",
  subject: t.imageSubject || "(none)",
}))

const wps = []
const threads = []
for (let i = 1; i <= 120; i++) {
  if (!data.hasThread(i)) continue
  const t = data.getThread(i)
  threads.push({ id: t.id, title: t.title, city: t.city })
  for (const wp of t.waypoints || [])
    wps.push({
      threadId: t.id,
      thread: t.title,
      city: t.city,
      id: wp.id,
      name: wp.name,
      image: wp.image || null,
      status: wp.imageStatus || "(none)",
    })
}

console.log("threads:", threads.length, "library:", library.length, "waypoints:", wps.length)

function hashOf(rel) {
  const abs = path.join(ROOT, rel.replace(/\//g, path.sep))
  if (!fs.existsSync(abs)) return null
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex")
}

const missing = []
for (const w of wps) if (w.image && !fs.existsSync(path.join(ROOT, w.image.replace(/\//g, path.sep)))) missing.push(["waypoint", w.threadId, w.id, w.name, w.image])
for (const t of library) if (t.image && !fs.existsSync(path.join(ROOT, t.image.replace(/\//g, path.sep)))) missing.push(["cover", t.id, t.title, t.subject, t.image])

console.log("\n=== referenced files that do not exist ===")
console.log(missing.length ? missing.map((m) => m.join(" | ")).join("\n") : "none")

/* every raster under assets/places, hashed */
const onDisk = new Map()
const PLACES = path.join(ROOT, "assets", "places")
for (const folder of fs.readdirSync(PLACES)) {
  const dir = path.join(PLACES, folder)
  if (!fs.statSync(dir).isDirectory()) continue
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(name)) continue
    const rel = "assets/places/" + folder + "/" + name
    const h = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex")
    if (!onDisk.has(h)) onDisk.set(h, [])
    onDisk.get(h).push(rel)
  }
}

const usedPaths = new Set()
for (const w of wps) if (w.image) usedPaths.add(w.image)
for (const t of library) if (t.image) usedPaths.add(t.image)

console.log("\n=== places claiming a photo whose bytes belong to another name ===")
let bad = 0
for (const w of wps) {
  if (!w.image || !/\.(jpe?g|png|webp)$/i.test(w.image)) continue
  const h = hashOf(w.image)
  if (!h) continue
  const group = onDisk.get(h) || []
  if (group.length < 2) continue
  bad++
  console.log("  " + w.name.padEnd(36) + "-> " + w.image)
  console.log("      shares bytes with: " + group.filter((g) => g !== w.image).join(", "))
  console.log("      imageStatus=" + w.status + "  caption subject=" + (w.subject || "(none)"))
}
console.log("  count: " + bad)

console.log("\n=== covers ===")
for (const t of library) {
  const raster = t.image && /\.(jpe?g|png|webp)$/i.test(t.image)
  const dup = t.image ? (onDisk.get(hashOf(t.image)) || []).length : 0
  console.log(
    "  " + String(t.id).padEnd(4) + t.title.padEnd(34) + String(t.image).padEnd(62) + t.status.padEnd(14) + (dup > 1 ? "SHARED-BYTES(" + dup + ")" : raster ? "photo" : "illustration"),
  )
}

console.log("\n=== raster place refs by file, referenced more than once ===")
const counts = new Map()
for (const w of wps) if (w.image) counts.set(w.image, (counts.get(w.image) || 0) + 1)
let dups = 0
for (const [k, v] of counts) {
  if (v > 1) {
    dups++
    console.log("  " + v + "x  " + k)
  }
}
console.log("  count: " + dups)

console.log("\n=== imageStatus census (waypoints) ===")
const cens = {}
for (const w of wps) {
  const key = w.status + (w.image && /\.(jpe?g|png|webp)$/i.test(w.image) ? " +raster" : " +svg")
  cens[key] = (cens[key] || 0) + 1
}
console.log("  " + JSON.stringify(cens, null, 2).replace(/\n/g, "\n  "))
