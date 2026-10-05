"use strict"
/* Temporary: for every place currently wired to a photograph, report what the
   two source manifests say about that place/file. A place whose audit verdict is
   weaker than "exact_or_strong" but is still captioned "Photograph of <place>"
   is a false-photo claim the byte-hash check cannot see. */
const fs = require("node:fs")
const path = require("node:path")

const ROOT = __dirname
const wire = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "places", "photo-manifest.json"), "utf8"))
const man = JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "naseej-place-image-manifest.json"), "utf8"))
const commons = JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "naseej-commons-image-manifest.json"), "utf8"))

const byPlace = new Map()
for (const p of man.places || []) byPlace.set(p.place, p)
const cByPlace = new Map()
for (const r of commons.results || []) if (r.status === "DOWNLOADED") cByPlace.set(r.place, r)

const rows = []
for (const [place, rel] of Object.entries(wire.exact_photo)) {
  const m = byPlace.get(place)
  const c = cByPlace.get(place)
  rows.push({
    place,
    rel,
    manMatch: m ? m.match_level : "(absent)",
    manReview: m ? String(m.review_required) : "-",
    manFile: m ? String(m.output || "").replace(/^.*\//, "") : "-",
    commonsMatch: c ? c.match_type : "(absent)",
    commonsFile: c ? String(c.photo_path || "").replace(/^.*\//, "") : "-",
    sameFile: m ? String(m.output || "").replace(/^.*\//, "") === String(rel).replace(/^.*\//, "") : false,
  })
}

const weak = rows.filter((r) => r.manMatch !== "exact_or_strong")
console.log("wired photos:", rows.length, "| manifest verdict weaker than exact_or_strong:", weak.length)
console.log("")
for (const r of weak)
  console.log(
    "  " + r.place.padEnd(34) +
      String(r.rel).replace("assets/places/", "").padEnd(46) +
      "audit=" + String(r.manMatch).padEnd(20) +
      "review=" + r.manReview.padEnd(6) +
      "manifestFile=" + String(r.manFile).padEnd(44) +
      "commons=" + String(r.commonsMatch).padEnd(18) +
      (r.sameFile ? "" : "  FILE DIFFERS"),
  )

console.log("\n--- places with a wired photo but NO manifest entry at all ---")
console.log(rows.filter((r) => r.manMatch === "(absent)").map((r) => r.place + " -> " + r.rel).join("\n") || "none")

console.log("\n--- manifest places whose audit file differs from the wired file ---")
console.log(
  rows
    .filter((r) => r.manMatch !== "(absent)" && !r.sameFile)
    .map((r) => r.place + ": wired " + r.rel + "  vs audit " + r.manFile + " (" + r.manMatch + ")")
    .join("\n") || "none",
)
