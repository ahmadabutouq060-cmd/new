"use strict"
/* Temporary: audit an arbitrary js/data.js (arg 1) for byte-shared photographs. */
const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")
const vm = require("node:vm")

const ROOT = __dirname
const DATA = process.argv[2]
const src = fs.readFileSync(DATA, "utf8")
const sandbox = { window: { NASEEJ: {} } }
vm.runInNewContext(src, sandbox, { filename: DATA })
const data = sandbox.window.NASEEJ.data

const wps = []
for (let i = 1; i <= 120; i++) {
  if (!data.hasThread(i)) continue
  const t = data.getThread(i)
  for (const wp of t.waypoints || [])
    wps.push({ threadId: t.id, id: wp.id, name: wp.name, image: wp.image || null, status: wp.imageStatus || "(none)" })
}

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

let photos = 0
let ill = 0
let bad = 0
const badNames = []
for (const w of wps) {
  if (!w.image) continue
  if (!/\.(jpe?g|png|webp)$/i.test(w.image)) { ill++; continue }
  photos++
  const abs = path.join(ROOT, w.image.replace(/\//g, path.sep))
  if (!fs.existsSync(abs)) { console.log("  MISSING " + w.image + "  (" + w.name + ")"); continue }
  const h = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex")
  const g = (onDisk.get(h) || []).filter((x) => x !== w.image)
  if (g.length) {
    bad++
    badNames.push(w.name)
    console.log("  " + w.name.padEnd(34) + "-> " + w.image)
    console.log("      identical bytes: " + g.join(", "))
  }
}
console.log("waypoints:", wps.length, "photos:", photos, "illustrations:", ill, "false-photo claims:", bad)
console.log(badNames.join(" | "))
