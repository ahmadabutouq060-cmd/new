/* Merge the 16 shard artifacts into assets/places and rebuild the manifests.

   This runs in the merge job, where every shard artifact has been downloaded
   into ./collected with merge-multiple, so the expected shape is:

       collected/
         manifests/shard-0.json ... shard-15.json
         assets/places/<destination>/<file>.webp

   Three things this script exists to guarantee:

   1. It validates that shape instead of discovering it by crashing. A shard
      whose Openverse searches all came back empty produces no images, which is
      a normal outcome, not a failure -- but it used to leave the artifact with
      only manifests/, the upload still succeeded, and the merge then died on
      `ENOENT ... collected\assets\places`. That is a confusing error for a run
      that did nothing wrong.

   2. A file's name follows its bytes. Firebase Hosting picks Content-Type from
      the extension, so a .jpg holding WebP is served as image/jpeg and will not
      decode. Every incoming file is sniffed and renamed to the extension the
      bytes actually deserve.

   3. Re-running it changes nothing. Both manifests carry a generated_at, and
      bumping that alone would dirty the working tree on every run and hand the
      workflow a commit containing nothing but a timestamp.

   The repository is resolved from this file rather than from process.cwd(), so
   it behaves the same from the repo root and from the runner's default
   workspace directory. */

import fs from "node:fs/promises"

import path from "node:path"

import { fileURLToPath } from "node:url"

import {
  sniffFormat,
  isLfsPointer,
  withCorrectExtension,
} from "./lib/image-signatures.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const COLLECTED = process.env.NASEEJ_COLLECTED_ROOT
  ? path.resolve(ROOT, process.env.NASEEJ_COLLECTED_ROOT)
  : path.join(ROOT, "collected")

const PLACES = path.join(ROOT, "assets", "places")

const DOCS_MF = path.join(ROOT, "docs", "naseej-place-image-manifest.json")

const ASSET_MF = path.join(ROOT, "assets", "places", "photo-manifest.json")

const EXPECTED_SHARDS = Number(process.env.NASEEJ_SHARDS || 16)

const problems = []

const note = (m) => {
  console.log("  " + m)
}

const fail = (m) => {
  problems.push(m)
  console.error("ERROR: " + m)
}

const exists = async (p) =>
  fs.access(p).then(
    () => true,
    () => false,
  )

async function isDir(p) {
  try {
    return (await fs.stat(p)).isDirectory()
  } catch {
    return false
  }
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/")

async function walk(dir, base = dir, out = []) {
  let entries

  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const e of entries) {
    const p = path.join(dir, e.name)

    if (e.isDirectory()) await walk(p, base, out)
    else if (e.isFile())
      out.push(path.relative(base, p).split(path.sep).join("/"))
  }

  return out
}

/* ---- 1. validate the collected layout ------------------------------------- */

console.log("validating collected layout at " + rel(COLLECTED))

if (!(await exists(COLLECTED))) {
  console.error("")

  console.error("ERROR: no collected directory at " + rel(COLLECTED) + ".")

  console.error("")

  console.error(
    "Nothing to merge. The merge job downloads every shard artifact into",
  )

  console.error(
    "this path with actions/download-artifact@merge-multiple, so its absence",
  )

  console.error(
    "means either the download step did not run or the artifacts were empty.",
  )

  console.error(
    "Check the preceding steps in this job before re-running the merge.",
  )

  process.exit(1)
}

const MANIFESTS = path.join(COLLECTED, "manifests")

if (!(await isDir(MANIFESTS))) {
  console.error("")

  console.error(
    "ERROR: " + rel(COLLECTED) + " exists but has no manifests/ directory.",
  )

  console.error("A shard artifact is expected to hold manifests/shard-N.json.")

  process.exit(1)
}

const present = new Set(
  (await fs.readdir(MANIFESTS))

    .filter((f) => /^shard-\d+\.json$/.test(f))

    .map((f) => f.replace(/^shard-|\.json$/g, "")),
)

const missing = []

for (let i = 0; i < EXPECTED_SHARDS; i++)
  if (!present.has(String(i))) missing.push(i)

if (missing.length) {
  console.error("")

  console.error(
    "ERROR: expected " +
      EXPECTED_SHARDS +
      " shard manifests under " +
      rel(MANIFESTS) +
      ", but " +
      missing.length +
      " are missing: shard-" +
      missing.join(".json, shard-") +
      ".json",
  )

  console.error(
    "Found: " +
      (present.size
        ? Array.from(present)
            .sort()
            .map((i) => "shard-" + i + ".json")
            .join(", ")
        : "(none)"),
  )

  console.error("")

  console.error(
    "A shard that produced no images still uploads successfully because its",
  )

  console.error(
    "manifest is a file, so a missing manifest means that shard's job never",
  )

  console.error(
    "completed. Check the shard jobs for shard-" +
      missing.slice(0, 4).join(", shard-") +
      ".",
  )

  process.exit(1)
}

note("all " + EXPECTED_SHARDS + " shard manifests present")

/* ---- 2. read the shard manifests ----------------------------------------- */

const shards = []

for (let i = 0; i < EXPECTED_SHARDS; i++) {
  const file = path.join(MANIFESTS, "shard-" + i + ".json")

  let parsed

  try {
    parsed = JSON.parse(await fs.readFile(file, "utf8"))
  } catch (err) {
    fail("shard-" + i + ".json is not valid JSON: " + err.message)

    continue
  }

  if (!Array.isArray(parsed.results)) {
    fail("shard-" + i + ".json has no results array")

    continue
  }

  shards.push(parsed)
}

if (problems.length) {
  console.error("")

  console.error(
    "Aborting: " + problems.length + " shard manifest(s) could not be read.",
  )

  process.exit(1)
}

note(
  "read " +
    shards.length +
    " shard manifests, " +
    shards.reduce((n, s) => n + s.results.length, 0) +
    " place results",
)

/* ---- 3. decide whether there is anything to merge ------------------------- */

const declared = shards.reduce(
  (n, s) =>
    n + (s.results || []).filter((r) => r.status === "downloaded").length,
  0,
)

const COLLECTED_PLACES = path.join(COLLECTED, "assets", "places")

if (!(await isDir(COLLECTED_PLACES))) {
  if (declared === 0) {
    /* Every shard ran and every search came back empty. There is genuinely no
       image in any artifact, which is a legitimate outcome, so this is a clean
       no-op rather than an error. Exiting non-zero here is what turned an
       uneventful collection run into a red build. */

    console.log("")

    console.log(
      "No shard downloaded an image, so there is no assets/places to merge.",
    )

    console.log("Nothing to change. Done.")

    process.exit(0)
  }

  console.error("")

  console.error(
    "ERROR: " +
      rel(COLLECTED_PLACES) +
      " is missing, but " +
      declared +
      " place(s) across the shards are recorded as downloaded.",
  )

  console.error("")

  console.error(
    "Those files should have been in the shard artifacts. Either the shard",
  )

  console.error(
    "wrote them somewhere other than its output root, or the artifact upload",
  )

  console.error("excluded them. The recorded outputs are listed below.")

  for (const s of shards)
    for (const r of s.results || []) {
      if (r.status === "downloaded")
        console.error("  shard-" + s.shard + "  " + r.output)
    }

  process.exit(1)
}

note("collected/assets/places present, " + declared + " download(s) declared")

/* ---- 4. copy files, trusting bytes over names ---------------------------- */

const results = shards.flatMap((s) => s.results || [])

let copied = 0

const renamed = []

const skipped = []

for (const r of results) {
  if (r.status !== "downloaded") continue

  const src = path.join(COLLECTED, String(r.output).split("/").join(path.sep))

  /* Refuse anything that escapes assets/places. A manifest is data fetched from
     an external API, so a stray "../" in an output path is not hypothetical. */

  const dest = path.resolve(
    PLACES,
    path.relative("assets/places", String(r.output).split("/").join(path.sep)),
  )

  if (!dest.startsWith(path.resolve(PLACES) + path.sep)) {
    fail("output path escapes assets/places: " + r.output)

    continue
  }

  if (!(await exists(src))) {
    /* A shard can legitimately have no file for this result if its own write
       failed after the manifest was recorded. Say so and keep going; the missing
       file is left to be filled by a later run, which is exactly the
       "preserve existing valid images" behaviour. */

    skipped.push(r.output)

    continue
  }

  const bytes = await fs.readFile(src)

  if (isLfsPointer(bytes)) {
    fail(
      "refusing to import a Git LFS pointer instead of image data: " + r.output,
    )

    continue
  }

  const sig = sniffFormat(bytes)

  if (!sig) {
    fail("not a recognised image format, refusing to import: " + r.output)

    continue
  }

  const target = withCorrectExtension(dest, bytes)

  if (target.corrected) {
    renamed.push({
      from: r.output,
      to: path.relative(ROOT, target.path).split(path.sep).join("/"),
    })

    /* Keep the manifest honest about the name that actually exists. */

    r.output = path.relative(ROOT, target.path).split(path.sep).join("/")
  }

  await fs.mkdir(path.dirname(target.path), { recursive: true })

  const before = await fs.readFile(target.path).catch(() => null)

  if (before && before.equals(bytes)) continue // already identical, nothing to write

  await fs.writeFile(target.path, bytes)

  copied++
}

note(
  "copied " +
    copied +
    " file(s)" +
    (skipped.length ? ", " + skipped.length + " declared-but-absent" : ""),
)

if (renamed.length) {
  note("renamed to match the bytes:")

  for (const n of renamed) note("  " + n.from + " -> " + n.to)
}

if (skipped.length) {
  console.log(
    "  declared in a manifest but absent from the artifact (existing files left untouched):",
  )

  for (const s of skipped) console.log("    " + s)
}

if (problems.length) {
  console.error("")

  console.error(
    "Aborting after " +
      problems.length +
      " problem(s); nothing further was written.",
  )

  process.exit(1)
}

/* ---- 5. rebuild the manifests ------------------------------------------- */

/* generated_at is the one field allowed to differ between two runs that are
   otherwise identical. Writing it unconditionally would make every run dirty the
   tree and every workflow commit a timestamp, so it is only advanced when some
   other field actually changed. */

async function writeStable(file, build) {
  const next = build()

  let previous = null

  try {
    previous = JSON.parse(await fs.readFile(file, "utf8"))
  } catch {}

  const stamp = { ...next }

  delete stamp.generated_at

  const was = previous ? { ...previous } : null

  if (was) delete was.generated_at

  const unchanged = was && JSON.stringify(stamp) === JSON.stringify(was)

  if (unchanged) {
    console.log("  " + rel(file) + " unchanged")

    return false
  }

  const stamped = { generated_at: new Date().toISOString(), ...next }

  delete stamped.generated_at

  await fs.mkdir(path.dirname(file), { recursive: true })

  await fs.writeFile(
    file,
    JSON.stringify(
      { generated_at: stamped.generated_at ?? next.generated_at, ...stamped },
      null,
      2,
    ) + "\n",
  )

  console.log("  " + rel(file) + " updated")

  return true
}

console.log("rebuilding manifests")

let docBefore = null

try {
  docBefore = JSON.parse(await fs.readFile(DOCS_MF, "utf8"))
} catch {}

/* Spread the existing place entry first so fields this script does not know
   about survive, then layer the fresh result over it. */

const byPlace = new Map()

for (const r of results) {
  const prev = docBefore?.places?.find?.((p) => p.place === r.place) || {}

  byPlace.set(r.place, { ...prev, ...r })
}

const places = (docBefore?.places || [])

  .map((p) => byPlace.get(p.place))

  .filter(Boolean)

  .concat(
    Array.from(byPlace.values()).filter(
      (r) => !docBefore?.places?.some?.((p) => p.place === r.place),
    ),
  )

await writeStable(DOCS_MF, () => {
  const doc = { ...(docBefore || {}) }

  doc.source = "Openverse (sharded GitHub Actions collector)"

  doc.count = places.length

  doc.downloaded = places.filter((r) => r.status === "downloaded").length

  doc.no_image = places.filter((r) => r.status !== "downloaded").length

  doc.places = places

  return doc
})

/* assets/places/photo-manifest.json has a second owner: scripts/
   wire-waypoint-images.cjs writes the photo-assignment record there, and
   scripts/build.cjs reads skipped_duplicate_byte_files from it to tell an
   intentionally-unreferenced duplicate byte apart from a genuinely orphaned
   asset. Overwriting the file with a collector-shaped object silently drops
   those keys and resurrects 11 build warnings, so unknown keys are carried
   through untouched and the collection log is added alongside them. */

let assetBefore = {}

try {
  assetBefore = JSON.parse(await fs.readFile(ASSET_MF, "utf8")) || {}
} catch {}

await writeStable(ASSET_MF, () => ({
  ...assetBefore,

  collection: {
    source: "Openverse (sharded GitHub Actions collector)",

    shards: EXPECTED_SHARDS,

    downloaded: places.filter((r) => r.status === "downloaded").length,

    no_image: places.filter((r) => r.status !== "downloaded").length,

    renamed_to_match_bytes: renamed,

    declared_but_absent: skipped,

    results,
  },
}))

console.log("")

console.log(
  "MERGE_DONE copied " + copied + " renamed " + renamed.length + " problems 0",
)
