/**
 * NASEEJ — source and download one image per current Place/Waypoint.
 *
 * Usage:
 *   node scripts/download-place-images.mjs
 *
 * What it does:
 *   1) Searches Wikimedia Commons for each exact Place name.
 *   2) Downloads a raster candidate when one exists.
 *   3) Writes assets/places/<governorate>/<slug>.jpg
 *   4) Writes assets/places/photo-manifest.json with source + license metadata.
 *
 * IMPORTANT:
 * This is a sourcing helper, not an automatic truth engine. Review each image
 * before assigning it to a waypoint. Experience-style stops may have no exact
 * public image. Never label a generic city/region photo as an exact place.
 */

import fs from "node:fs/promises"

import path from "node:path"

const ROOT = process.cwd()

const MANIFEST = path.join(ROOT, "docs", "naseej-place-image-manifest.json")

const OUT_ROOT = path.join(ROOT, "assets", "places")

const API = "https://commons.wikimedia.org/w/api.php"

const BLOCK =
  /(logo|icon|map|flag|coat of arms|diagram|scheme|symbol|locator map|blank|route map)/i

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])

function slug(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
}

function cleanHtml(v = "") {
  return String(v)
    .replace(/<[^>]*>/g, "")
    .trim()
}

async function searchCommons(q) {
  const p = new URLSearchParams({
    action: "query",

    generator: "search",

    gsrnamespace: "6",

    gsrsearch: q,

    gsrlimit: "8",

    prop: "imageinfo",

    iiprop: "url|mime|size|extmetadata",

    iiurlwidth: "1800",

    format: "json",

    origin: "*",
  })

  const r = await fetch(`${API}?${p}`, {
    headers: { "User-Agent": "NASEEJ-place-image-loader/1.0" },
  })

  if (!r.ok) throw new Error(`Wikimedia HTTP ${r.status}`)

  return r.json()
}

function usable(page) {
  const i = page?.imageinfo?.[0]

  if (!i?.url || !ALLOWED.has(i.mime)) return false

  if (BLOCK.test(page.title || "")) return false

  if ((i.width || 0) < 900 || (i.height || 0) < 500) return false

  return true
}

function metadata(page) {
  const i = page.imageinfo[0],
    e = i.extmetadata || {}

  return {
    commons_title: page.title,

    source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,

    direct_url: i.url,

    mime: i.mime,

    width: i.width,

    height: i.height,

    license: cleanHtml(e.LicenseShortName?.value || e.UsageTerms?.value || ""),

    credit: cleanHtml(e.Artist?.value || ""),
  }
}

const source = JSON.parse(await fs.readFile(MANIFEST, "utf8"))

await fs.mkdir(OUT_ROOT, { recursive: true })

const results = []

for (const item of source.places) {
  const dir = path.join(OUT_ROOT, slug(item.governorate))

  await fs.mkdir(dir, { recursive: true })

  const output = path.join(dir, `${slug(item.place)}.jpg`)

  try {
    const q1 = `intitle:"${item.place}" ${item.governorate} Jordan`

    let pages = Object.values((await searchCommons(q1)).query?.pages || {})

    let chosen = pages.find(usable)

    if (!chosen) {
      const q2 = `"${item.place}" ${item.governorate} Jordan`

      pages = Object.values((await searchCommons(q2)).query?.pages || {})

      chosen = pages.find(usable)
    }

    if (!chosen) {
      results.push({ ...item, status: "NO_CANDIDATE", review: true, output })

      continue
    }

    const i = chosen.imageinfo[0]

    const r = await fetch(i.url, {
      headers: { "User-Agent": "NASEEJ-place-image-loader/1.0" },
    })

    if (!r.ok) throw new Error(`image HTTP ${r.status}`)

    await fs.writeFile(output, Buffer.from(await r.arrayBuffer()))

    results.push({
      ...item,
      status: "DOWNLOADED",
      review: true,
      output,
      ...metadata(chosen),
    })
  } catch (err) {
    results.push({
      ...item,
      status: "ERROR",
      review: true,
      output,
      error: String(err?.message || err),
    })
  }

  await new Promise((r) => setTimeout(r, 250))
}

await fs.writeFile(
  path.join(OUT_ROOT, "photo-manifest.json"),

  JSON.stringify(
    {
      generated_at: new Date().toISOString(),

      source: "Wikimedia Commons",

      warning:
        "Review every downloaded image and its license before publishing. Some NASEEJ stops are experience labels rather than fixed landmarks.",

      results,
    },
    null,
    2,
  ),
)

console.log(`Processed ${results.length} places.`)

console.log(
  `Downloaded: ${results.filter((x) => x.status === "DOWNLOADED").length}`,
)

console.log(
  `Needs review/no image: ${results.filter((x) => x.status !== "DOWNLOADED").length}`,
)
