/* Render every route in jsdom and report the image situation per route. Read-only. */
import fs from "node:fs"
import path from "node:path"
import { JSDOM } from "jsdom"

const ROOT = "C:/Users/LENOVO/new-19"
const SCRIPTS = ["js/data.js", "js/navigation.js", "js/firebase.js", "js/pages.js", "js/auth.js", "js/app.js"]

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), {
  url: "http://localhost:3000/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
})
const { window } = dom
window.scrollTo = () => {}
window.scrollBy = () => {}
for (const rel of SCRIPTS) {
  const el = window.document.createElement("script")
  el.textContent = fs.readFileSync(path.join(ROOT, rel), "utf8")
  window.document.body.appendChild(el)
}
const data = window.NASEEJ.data

console.log("=== THREAD ID RESOLUTION ===")
console.log("getThread(1).title        =", JSON.stringify(data.getThread(1)?.title))
console.log("getThread(1).waypoints.len=", data.getThread(1).waypoints.length)
console.log("libraryThreads count      =", data.libraryThreads.length)
console.log("libraryThreads[0]         =", data.libraryThreads[0].id, JSON.stringify(data.libraryThreads[0].title))
console.log("hasThread(1)              =", data.hasThread(1))

console.log("\n=== GETTHREAD(1) WAYPOINT IMAGES AS RENDERED ===")
for (const wp of data.getThread(1).waypoints) {
  const photo = data.waypointPhoto(wp)
  console.log(
    "  id=" + wp.id,
    JSON.stringify(wp.name).padEnd(34),
    "status=" + String(wp.status).padEnd(10),
    "image=" + String(wp.image),
    "\n      waypointPhoto -> " + JSON.stringify(photo),
  )
}
console.log("  photoFor(thread1) ->", JSON.stringify(data.photoFor(data.getThread(1))))

const routes = []
for (const e of data.libraryThreads || []) {
  routes.push("#/thread/" + e.id)
  for (const wp of data.getThread(e.id).waypoints || []) routes.push("#/place/" + e.id + "/" + wp.id)
}

console.log("\n=== PER-ROUTE IMAGE INVENTORY (" + routes.length + " routes) ===")
const rows = []
for (const hash of routes) {
  window.location.hash = hash
  try {
    window.NASEEJ.route()
  } catch (err) {
    rows.push({ hash, err: err.message })
    continue
  }
  const app = window.document.getElementById("app")
  const html = app.innerHTML
  const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1])
  const illus = (html.match(/waypoint-illus\b/g) || []).length
  const notVerified = (html.match(/Photo not verified/g) || []).length
  const notThisStop = (html.match(/— not this stop/g) || []).length
  const svgImgs = imgs.filter((s) => s.endsWith(".svg"))
  const jpgImgs = imgs.filter((s) => !s.endsWith(".svg"))
  rows.push({ hash, imgs: imgs.length, illus, notVerified, notThisStop, svgImgs, jpgImgs, bytes: html.length })
}

const errs = rows.filter((r) => r.err)
console.log("render errors: " + errs.length)
for (const r of errs) console.log("  ERR " + r.hash + ": " + r.err)

const ok = rows.filter((r) => !r.err)
const totalImg = ok.reduce((a, r) => a + r.imgs, 0)
const totalIllus = ok.reduce((a, r) => a + r.illus, 0)
const totalNV = ok.reduce((a, r) => a + r.notVerified, 0)
console.log("routes ok: " + ok.length)
console.log("total <img> emitted: " + totalImg + "  (svg-backed: " + ok.reduce((a, r) => a + r.svgImgs.length, 0) + ", raster-backed: " + ok.reduce((a, r) => a + r.jpgImgs.length, 0) + ")")
console.log("total inline illustration blocks: " + totalIllus)
console.log("total 'Photo not verified' disclosures: " + totalNV)
console.log("routes with zero <img>: " + ok.filter((r) => r.imgs === 0).length)

console.log("\n--- every distinct image src emitted, with usage count ---")
const counts = new Map()
for (const r of ok) for (const s of r.jpgImgs.concat(r.svgImgs)) counts.set(s, (counts.get(s) || 0) + 1)
const sorted = [...counts].sort((a, b) => b[1] - a[1])
for (const [src, n] of sorted) {
  const onDisk = fs.existsSync(path.join(ROOT, src))
  console.log("  " + String(n).padStart(4) + "  " + (onDisk ? "OK   " : "GONE ") + src)
}

if (process.argv.includes("--routes")) {
  console.log("\n--- full per-route detail ---")
  for (const r of ok) {
    console.log(
      r.hash.padEnd(20) + " img=" + String(r.imgs).padStart(2) + " illus=" + String(r.illus).padStart(2) + " notVerified=" + String(r.notVerified).padStart(2) + " notThisStop=" + String(r.notThisStop).padStart(2),
    )
  }
}