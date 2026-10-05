"use strict"
/* Temporary: cross-check every photo currently assigned in data.js against the
   reviewed audit manifest's match_level, to catch a place captioned as a
   photograph of itself whose file the audit never matched to that place. */
const fs = require("node:fs")
const path = require("node:path")

const ROOT = __dirname
const man = JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "naseej-place-image-manifest.json"), "utf8"))
const wire = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "places", "photo-manifest.json"), "utf8"))
const commons = JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "naseej-commons-image-manifest.json"), "utf8"))

console.log("manifest top-level keys:", Object.keys(man).join(", "))
console.log("sample place entry:", JSON.stringify((man.places || [])[0], null, 2).slice(0, 600))
console.log("\ncommons sample result:", JSON.stringify((commons.results || [])[0], null, 2).slice(0, 600))
console.log("\nexact_photo entries:", Object.keys(wire.exact_photo).length)
