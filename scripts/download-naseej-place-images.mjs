import fs from "node:fs/promises"

import path from "node:path"

import { fileURLToPath } from "node:url"

import {
  sniffFormat,
  isLfsPointer,
  withCorrectExtension,
} from "./lib/image-signatures.mjs"

/* Resolved from this file, not from process.cwd(), so the script writes to the
   repository it belongs to no matter which directory the runner starts in. A
   collector that silently writes its output somewhere else is how the merge
   ended up looking for collected/assets/places that no shard had produced. */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const MF = path.join(ROOT, "docs", "naseej-place-image-manifest.json")

const API = "https://api.openverse.org/v1/images/"

const UA = "NASEEJ/3.0 place-photo collector"

const LICENSES = new Set(["cc0", "by", "by-sa", "publicdomain", "pdm"])

const BAD =
  /(logo|icon|flag|map|locator|diagram|scheme|coat of arms|symbol|illustration|watermark)/i

const shard = Number(process.env.NASEEJ_SHARD || 0)

const shards = Number(process.env.NASEEJ_SHARDS || 1)

const outRoot = process.env.NASEEJ_OUTPUT_ROOT
  ? path.resolve(ROOT, process.env.NASEEJ_OUTPUT_ROOT)
  : ROOT

/* The one path every shard agrees on. A shard that downloads nothing must still
   produce it, because the merge validates the artifact layout rather than
   guessing at it: Openverse rate-limits, so a shard whose places all came back
   no_safe_image_found is an ordinary outcome, not a failure. Before this was
   created up front, such a shard's artifact held only manifests/, the artifact
   upload still succeeded, and the merge died on a missing collected/assets/places. */

const PLACES_OUT = path.join(outRoot, "assets", "places")

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function request(url, attempts = 5) {
  let last

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      })

      if (res.ok) return res

      last = new Error("HTTP " + res.status)

      if (![408, 429, 500, 502, 503, 504].includes(res.status)) throw last
    } catch (e) {
      last = e
    }

    await sleep(Math.min(6000, 800 * (i + 1)))
  }

  throw last || new Error("request failed")
}

function clean(s) {
  return String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function words(s) {
  return clean(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[—&]/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 2)
}

function score(item, r) {
  const all = [
    clean(r.title),

    clean(r.description),

    clean(r.alt_text),

    (r.tags || [])
      .map((x) => (typeof x === "string" ? x : x?.name || ""))
      .join(" "),
  ]
    .join(" ")
    .toLowerCase()

  let s = 0

  for (const w of words(item.place))
    if (all.includes(w)) s += w.length >= 6 ? 3 : 1

  if (all.includes(String(item.governorate).toLowerCase().replace("al-", "")))
    s += 2

  if (all.includes("jordan")) s += 1

  if (BAD.test(all) || r.watermarked === true) s -= 20

  return s
}

function queries(item) {
  const p = item.place

  const g = item.governorate

  const t = item.thread

  const stripped = p
    .replace(/\([^)]*\)/g, "")
    .replace(/\s*[—-]\s*.*$/g, "")
    .replace(/\s*&\s*.*$/g, "")
    .trim()

  return [
    ...new Set(
      [
        p + " " + g + " Jordan",

        stripped + " " + g + " Jordan",

        t + " " + g + " Jordan",

        g + " Jordan " + stripped,
      ].filter((x) => x.trim().length > 4),
    ),
  ]
}

async function search(q) {
  const u =
    API +
    "?" +
    new URLSearchParams({
      q,
      page_size: "30",
      mature: "false",
      format: "json",
      order_by: "relevance",
    })

  const j = await (await request(u)).json()

  return j?.results ?? []
}

function licenseOkay(r) {
  return LICENSES.has(String(r.license ?? "").toLowerCase())
}

function candidateUrl(r) {
  return r.thumbnail || r.url || null
}

/* Name the file from the bytes, never from the manifest. Openverse's CDN hands
   back WebP for most of these URLs whatever the URL says, and the manifest's
   output field is a hardcoded .jpg. Writing those bytes to that name produced
   .jpg files under assets/places full of WebP, which Firebase then served as
   image/jpeg and browsers refused to decode. */

async function save(url, outPath) {
  const res = await request(url)

  const b = Buffer.from(await res.arrayBuffer())

  if (b.length < 8000) throw new Error("image payload too small")

  if (b.length > 4000000) throw new Error("image payload too large")

  if (isLfsPointer(b))
    throw new Error("payload is a Git LFS pointer, not image data")

  const sig = sniffFormat(b)

  if (!sig) throw new Error("payload is not a recognised image format")

  const target = withCorrectExtension(outPath, b)

  await fs.mkdir(path.dirname(target.path), { recursive: true })

  await fs.writeFile(target.path, b)

  return {
    /* Repository-relative and forward-slashed, which is the form js/data.js
       stores and the form the merge expects to see under assets/places. */

    output: path.relative(outRoot, target.path).split(path.sep).join("/"),

    mime: sig.mime,

    reported_mime:
      (res.headers.get("content-type") || "").split(";")[0] || null,

    renamed_from_extension: target.corrected ? target.from : null,

    bytes: b.length,
  }
}

async function collectOne(item) {
  /* Provisional path: the extension is corrected by save() once the bytes are
     known, so this only has to get the directory right. */

  const output = path.join(outRoot, item.output)

  const candidates = []

  for (const q of queries(item)) {
    let results = []

    try {
      results = await search(q)
    } catch {}

    for (const r of results) {
      if (!licenseOkay(r)) continue

      if ((r.width ?? 0) < 400 || (r.height ?? 0) < 250) continue

      const u = candidateUrl(r)

      if (!u) continue

      if (BAD.test((r.title || "") + " " + (r.description || ""))) continue

      candidates.push({ ...r, _score: score(item, r) })
    }

    if (candidates.some((x) => x._score >= 7)) break

    await sleep(150)
  }

  candidates.sort((a, b) => b._score - a._score)

  for (const r of candidates.slice(0, 15)) {
    try {
      const saved = await save(candidateUrl(r), output)

      const sc = r._score

      return {
        ...item,

        /* The real filename, after the extension was corrected to match the
           bytes. Spreading item first means this wins over its .jpg guess. */

        output: saved.output,

        status: "downloaded",

        match_level:
          sc >= 7
            ? "exact_or_strong"
            : sc >= 4
              ? "representative"
              : "weak_representative",

        review_required: sc < 7,

        match_score: sc,

        title: r.title || "",

        license:
          r.license === "publicdomain"
            ? "Public Domain"
            : r.license === "pdm"
              ? "Public Domain Mark"
              : r.license === "cc0"
                ? "CC0"
                : r.license === "by-sa"
                  ? "CC BY-SA"
                  : "CC BY",

        license_url: r.license_url || "",

        license_code: r.license || "",

        license_version: r.license_version || "",

        creator: r.creator || "Unknown",

        source: r.source || r.provider || "Openverse",

        provider: r.provider || "",

        source_url: r.foreign_landing_url || r.source_url || "",

        direct_url: r.url || "",

        thumbnail_url: r.thumbnail || "",

        openverse_url: "https://openverse.org/image/" + r.id,

        mime: saved.mime,

        reported_mime: saved.reported_mime,

        renamed_from_extension: saved.renamed_from_extension,

        width: r.width || null,

        height: r.height || null,

        bytes: saved.bytes,
      }
    } catch {}
  }

  return {
    ...item,
    status: "no_safe_image_found",
    match_level: "none",
    review_required: true,
  }
}

const source = JSON.parse(await fs.readFile(MF, "utf8"))

const selected = source.places.filter((_, i) => i % shards === shard)

const results = []

/* Every shard emits the same directory shape whether or not it manages to
   download anything: assets/places/ plus the per-destination folder each of its
   places belongs in, and manifests/. The merge validates that layout rather than
   assuming it, and this makes the claim true of every artifact instead of of
   whichever shards happened to find something.

   Creating the directories is best effort, not the guarantee. An artifact is a
   zip, and whether an empty directory survives as an entry depends on the
   archiver -- a local bsdtar round trip keeps all of them, but a directory with
   no file in it has no content to preserve and cannot be relied on. The merge
   therefore treats a missing assets/places as a legitimate outcome when no shard
   downloaded anything, and only as an error when a manifest claims a file that
   is not there. Do not read the mkdir as the thing that prevents the ENOENT. */

const folders = new Set(selected.map((item) => path.dirname(item.output)))

await fs.mkdir(path.join(outRoot, "manifests"), { recursive: true })

for (const folder of folders)
  await fs.mkdir(path.join(outRoot, folder), { recursive: true })

/* Created even when this shard owns no places at all (an out-of-range shard id
   in a widened matrix), so the layout claim does not depend on the slice. */

await fs.mkdir(PLACES_OUT, { recursive: true })

for (const item of selected) {
  const r = await collectOne(item).catch((e) => ({
    ...item,
    status: "error",
    match_level: "none",
    review_required: true,
    error: String(e?.message || e),
  }))

  results.push(r)

  console.log(
    "[shard " +
      shard +
      "/" +
      shards +
      "] " +
      item.governorate +
      " / " +
      item.place +
      " -> " +
      r.status +
      " / " +
      (r.match_level || ""),
  )

  await sleep(250)
}

/* What actually landed under assets/places, relative and forward-slashed. The
   merge cross-checks this against the directory listing rather than trusting
   the declared outputs, so a file that failed to write is caught as a mismatch
   instead of a 404 discovered later. */

async function listRelative(dir, base = dir) {
  const out = []

  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)

    if (entry.isDirectory()) out.push(...(await listRelative(p, base)))
    else if (entry.isFile())
      out.push(path.relative(base, p).split(path.sep).join("/"))
  }

  return out.sort()
}

const written = await listRelative(PLACES_OUT)

const manifestDir = path.join(outRoot, "manifests")

await fs.writeFile(
  path.join(manifestDir, "shard-" + shard + ".json"),

  JSON.stringify(
    {
      generated_at: new Date().toISOString(),

      shard,

      shards,

      count: results.length,

      files_written: written.length,

      written,

      downloaded: results.filter((x) => x.status === "downloaded").length,

      no_image: results.filter((x) => x.status !== "downloaded").length,

      results,
    },
    null,
    2,
  ),
)

console.log(
  "SHARD_DONE " +
    shard +
    " processed " +
    results.length +
    " downloaded " +
    results.filter((x) => x.status === "downloaded").length +
    " files " +
    written.length +
    " root " +
    path
      .relative(ROOT, outRoot || ".")
      .split(path.sep)
      .join("/"),
)
