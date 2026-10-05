"use strict"
/* Temporary: global byte-duplicate audit over EVERY image file the site
   references, across all of assets/ (not just assets/places/). */
const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")
const vm = require("node:vm")

const ROOT = __dirname
const src = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8")
const sandbox = { window: { NASEEJ: {} } }
vm.runInNewContext(src, sandbox, { filename: "js/data.js" })
const data = sandbox.window.NASEEJ.data

const claims = []
for (let i = 1; i <= 120; i++) {
  if (!data.hasThread(i)) continue
  const t = data.getThread(i)
  for (const wp of t.waypoints || [])
    if (wp.image) claims.push({ kind: "waypoint", where: "T" + t.id + " #" + wp.id, name: wp.name, image: wp.image, status: wp.imageStatus || "photo" })
}
for (const t of data.libraryThreads || [])
  if (t.image) claims.push({ kind: "cover", where: "T" + t.id, name: t.title, image: t.image, status: t.imageStatus || "photo" })

/* hash every raster under assets/ */
const all = new Map()
function walk(dir) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p)
    else if (/\.(jpe?g|png|webp|gif)$/i.test(n)) {
      const h = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")
      const rel = path.relative(ROOT, p).replace(/\\/g, "/")
      if (!all.has(h)) all.set(h, [])
      all.get(h).push(rel)
    }
  }
}
walk(path.join(ROOT, "assets"))

const shared = new Map()
for (const [h, files] of all) if (files.length > 1) shared.set(h, files)

console.log("claims:", claims.length, "| raster files under assets/:", [...all.values()].reduce((a, b) => a + b.length, 0), "| byte-duplicate groups:", shared.size)

const byHashOfClaim = new Map()
for (const c of claims) {
  const abs = path.join(ROOT, c.image.replace(/\//g, path.sep))
  if (!fs.existsSync(abs)) { console.log("MISSING " + c.image + " (" + c.name + ")"); continue }
  const h = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex")
  const group = shared.get(h)
  if (!group) continue
  const others = group.filter((g) => g !== c.image)
  const key = h
  if (!byHashOfClaim.has(key)) byHashOfClaim.set(key, { files: group, claims: [] })
  byHashOfClaim.get(key).claims.push(c)
}

let n = 0
for (const [h, g] of byHashOfClaim) {
  n++
  console.log("\ngroup " + h.slice(0, 12) + " files: " + g.files.join(", "))
  for (const c of g.claims) console.log("   " + c.kind.padEnd(9) + c.where.padEnd(9) + String(c.name).padEnd(34) + c.image.padEnd(58) + c.status)
}
console.log("\ngroups with >=1 claim:", n)
