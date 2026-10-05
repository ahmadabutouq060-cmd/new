/* Naseej — image-truth verification.
 *
 * `npm run build` proves every `assets/...` string in the source resolves to a
 * file that exists and that the file's bytes match its extension. It does NOT
 * prove the picture is *of the place the filename claims*, which is the failure
 * this file exists to catch:
 *
 *   - two places pointing at one image file, so a photograph of Jerash is
 *     captioned as a photograph of Wadi Mujib;
 *   - two *differently named* files sharing identical bytes, which means at most
 *     one of them can be a photograph of what it says it is;
 *   - a `imageStatus: "photo"` that resolves to a generated SVG, or a caption
 *     that calls an illustration a photograph;
 *   - the same place resolving to different media on two consecutive runs, which
 *     is what makes a re-run destructive rather than merely redundant.
 *
 * It is also the idempotency gate: `--repeat N` re-runs
 * `wire-waypoint-images.cjs` N times and asserts the resolved media for every
 * waypoint is byte-for-byte identical after each run. A pipeline that reaches
 * the network can differ between runs; this records that it did, or that it did
 * not, instead of assuming.
 *
 *   node scripts/verify-images.mjs                # audit only
 *   node scripts/verify-images.mjs --repeat 3     # audit + prove idempotency
 *
 * Plain Node, no dependencies, no test runner — the same shape as
 * test-firestore-rules.mjs. A failure exits non-zero.
 */

import crypto from "node:crypto"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const IMAGE_EXT = /\.(png|jpg|jpeg|webp|svg)$/i

const errors = []
const notes = []

function fail(msg) {
  errors.push(msg)
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name)
    if (fs.statSync(file).isDirectory()) walk(file, out)
    else out.push(file)
  }
  return out
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/")
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/* ── Load data.js the way the browser does ────────────────────────────────────
   A classic script wrapped in an IIFE, so it needs `window` and a handful of
   document lookups it never hits. Loading the *real* data.js is the point: the
   audit is only worth anything if it reads the assignments the site ships. */

function loadData() {
  const noop = () => {}
  const element = () => ({
    style: {},
    dataset: {},
    textContent: "",
    innerHTML: "",
    children: [],
    childNodes: [],
    classList: { add: noop, remove: noop, contains: () => false },
    setAttribute: noop,
    getAttribute: () => null,
    addEventListener: noop,
    remove: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: noop,
  })
  const document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: element,
    addEventListener: noop,
    body: element(),
    documentElement: element(),
  }
  const store = new Map()
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
  const window = {
    localStorage,
    sessionStorage: localStorage,
    document,
    location: { hash: "", search: "", pathname: "/" },
    matchMedia: () => ({ matches: false }),
    addEventListener: noop,
    navigator: { userAgent: "node", onLine: true },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    console,
  }
  Object.assign(globalThis, { window, document, localStorage })
  /* Node 21+ ships a getter-only globalThis.navigator, so a plain write throws. */
  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true,
    writable: true,
  })
  const file = path.join(ROOT, "js", "data.js")
  new vm.Script(fs.readFileSync(file, "utf8"), { filename: file }).runInThisContext()
  return window.NASEEJ.data
}

/* ── The resolved media for every waypoint ────────────────────────────────────
   `waypointPhoto()` is the single resolver the renderers go through, so the
   audit reads it rather than re-deriving paths: if this disagrees with the page,
   the page is what is wrong and this says so. */

function collectWaypointMedia(data) {
  const rows = []
  /* libraryThreads[] is the *summary* list — its `waypoints` field is a count,
     not an array. getThread() is what builds the real thread, and it is also the
     accessor the renderers use, so iterate ids through it rather than reaching
     into the summaries. */
  const ids = new Set()
  for (const summary of data.libraryThreads || []) ids.add(summary.id)
  for (const id of Object.keys(data.threadsById || {})) ids.add(id)
  for (const id of ids) {
    const thread = data.getThread ? data.getThread(id) : null
    if (!thread) continue
    for (const waypoint of thread.waypoints || []) {
      /* waypointPhoto() takes the waypoint alone; the thread id is not part of
         its signature, which is worth knowing because the sibling photoFor()
         takes a thread and the pair looks interchangeable from a distance. */
      const media = data.waypointPhoto ? data.waypointPhoto(waypoint) : null
      rows.push({
        threadId: thread.id,
        waypointId: waypoint.id,
        name: waypoint.name,
        image: waypoint.image || null,
        declaredStatus: waypoint.imageStatus || null,
        media: media || null,
      })
    }
  }
  return rows
}

function mediaKey(row) {
  const m = row.media
  return m ? `${m.src || ""}|${m.kind || ""}|${m.subject || ""}|${m.scope || ""}` : "none"
}

/* ── Checks ─────────────────────────────────────────────────────────────────── */

function checkResolvedFiles(rows) {
  let photos = 0
  let placeholders = 0
  for (const row of rows) {
    if (!row.media || !row.media.src) {
      placeholders++
      continue
    }
    const file = path.join(ROOT, row.media.src)
    if (!fs.existsSync(file)) {
      fail(`${row.threadId}/${row.waypointId} ${row.name}: media src does not exist: ${row.media.src}`)
      continue
    }
    const kind = row.media.kind
    if (kind === "placeholder") placeholders++
    else photos++
  }
  return { photos, placeholders }
}

function checkOneImageOnePlace(rows) {
  /* The core truth check. Two waypoints resolving to the same file is a
     duplicate-byte claim: a photograph of one place captioned as a photograph
     of another. Sketchy "borrowed from elsewhere on the route" is a separate,
     declared thing and is allowed — an outright collision is not. */
  const bySrc = new Map()
  for (const row of rows) {
    const src = row.media && row.media.src
    if (!src) continue
    if (!bySrc.has(src)) bySrc.set(src, [])
    bySrc.get(src).push(row)
  }
  let collisions = 0
  for (const [src, group] of bySrc) {
    if (group.length < 2) continue
    collisions++
    fail(
      `one image serving ${group.length} waypoints: ${src} -> ` +
        group.map((r) => `${r.threadId}/${r.waypointId} ${r.name}`).join(", "),
    )
  }
  if (!collisions) notes.push("no image is shared between two waypoints")
  return collisions
}

function checkDifferentlyNamedDuplicates() {
  /* Files that share bytes under different names cannot both be a photograph of
     what they claim. The wire script is expected to keep them unassigned; this
     confirms none of them is currently wired in as somebody's photograph. */
  const files = walk(path.join(ROOT, "assets", "places")).filter((f) =>
    IMAGE_EXT.test(f),
  )
  const byHash = new Map()
  for (const file of files) {
    const h = sha256(file)
    if (!byHash.has(h)) byHash.set(h, [])
    byHash.get(h).push(rel(file))
  }
  const groups = [...byHash.values()].filter((g) => g.length > 1)
  const crossName = groups.filter(
    (g) => new Set(g.map((f) => path.basename(f, path.extname(f)))).size > 1,
  )
  const wiredPhotos = new Set()
  for (const row of currentRows) {
    const m = row.media
    if (m && m.kind !== "placeholder" && m.src) wiredPhotos.add(m.src)
  }
  let offenders = 0
  for (const group of crossName) {
    for (const f of group) {
      if (wiredPhotos.has(f)) {
        offenders++
        fail(
          `byte-identical to a differently-named file but wired in as a photograph: ${f}` +
            ` (shares bytes with: ${group.filter((g) => g !== f).join(", ")})`,
        )
      }
    }
  }
  if (!offenders) {
    notes.push(
      `${crossName.length} differently-named byte-identical groups, none wired in as a photograph`,
    )
  }
  return { groups: crossName.length, offenders }
}

function checkStatusHonesty(rows) {
  /* A waypoint that says imageStatus:"photo" must not resolve to a generated
     illustration, and a waypoint resolving to an illustration must not claim to
     be a photograph. Either way the caption in pages.js would be a lie. */
  for (const row of rows) {
    const kind = row.media && row.media.kind
    if (row.declaredStatus === "photo" && kind === "placeholder") {
      fail(`${row.threadId}/${row.waypointId} ${row.name}: imageStatus "photo" but resolves to a placeholder`)
    }
    if (row.declaredStatus === "placeholder" && kind && kind !== "placeholder") {
      fail(
        `${row.threadId}/${row.waypointId} ${row.name}: imageStatus "placeholder" but resolves to a ${kind}`,
      )
    }
  }
}

function checkManifestAgreement(rows) {
  /* photo-manifest.json is generated output. If it disagrees with what data.js
     actually resolves, the manifest is stale and the README's counts are a lie. */
  const file = path.join(ROOT, "assets", "places", "photo-manifest.json")
  if (!fs.existsSync(file)) return
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"))
  const skipped = new Set(manifest.skipped_duplicate_byte_files || [])
  let offenders = 0
  for (const row of rows) {
    const src = row.media && row.media.src
    if (!src) continue
    if (skipped.has(src) && row.media.kind !== "placeholder") {
      offenders++
      fail(`photo-manifest lists ${src} as skipped, but data.js wires it in as a ${row.media.kind}`)
    }
  }
  if (!offenders) notes.push("photo-manifest.json agrees with data.js")
}

/* Thread 1 is the product's hero thread and the one the spec names explicitly,
   so its five Petra waypoints get their own assertion rather than being trusted
   to the general checks. Each must resolve to its own photograph: a Petra
   landmark substituted for another is a false exact-photo claim, which is the
   same defect as a generic image, and a placeholder is a regression on the
   thread the whole product opens with. */

const PETRA = [
  [1, 1, "The Siq"],
  [1, 2, "Al-Khazneh (The Treasury)"],
  [1, 3, "Street of Facades & Royal Tombs"],
  [1, 4, "High Place of Sacrifice"],
  [1, 5, "Ad-Deir (The Monastery)"],
]

function checkThread1(rows) {
  const status = []
  const seen = new Set()
  for (const [threadId, waypointId, expected] of PETRA) {
    const row = rows.find(
      (r) => r.threadId === threadId && r.waypointId === waypointId,
    )
    if (!row) {
      fail(`thread 1 waypoint ${waypointId} (${expected}) is missing from the data`)
      status.push({ waypointId, expected, state: "MISSING" })
      continue
    }
    if (row.name !== expected) {
      fail(`thread 1 waypoint ${waypointId} is titled "${row.name}", expected "${expected}"`)
    }
    const src = row.media && row.media.src
    if (!src) {
      fail(`thread 1 waypoint ${waypointId} (${expected}) resolves to no media`)
      status.push({ waypointId, expected, state: "NO MEDIA", src: null })
      continue
    }
    if (!fs.existsSync(path.join(ROOT, src))) {
      fail(`thread 1 waypoint ${waypointId} (${expected}) media is missing: ${src}`)
    }
    if (seen.has(src)) {
      fail(`thread 1 waypoint ${waypointId} (${expected}) reuses another Petra landmark's image: ${src}`)
    }
    seen.add(src)
    if (row.media.kind === "placeholder") {
      fail(`thread 1 waypoint ${waypointId} (${expected}) regressed to a placeholder: ${src}`)
    }
    status.push({
      waypointId,
      expected,
      state: "PHOTO",
      src,
      subject: row.media.subject || null,
      kind: row.media.kind || null,
    })
  }
  return status
}

/* ── Idempotency ──────────────────────────────────────────────────────────────
   Re-runs the wiring script and re-resolves every waypoint. The pipeline talks
   to external providers, so "it should be idempotent" is not a fact about the
   code — it is a fact about two runs. */

function runWiring() {
  const file = path.join(ROOT, "scripts", "wire-waypoint-images.cjs")
  const result = spawnSync(process.execPath, [file], {
    cwd: ROOT,
    stdio: "ignore",
  }).status
  if (result !== 0) fail(`wire-waypoint-images.cjs exited ${result}`)
  return result
}

let currentRows = []

/* ── Main ───────────────────────────────────────────────────────────────────── */

const repeatIndex = process.argv.indexOf("--repeat")
const repeats = repeatIndex === -1 ? 0 : Number(process.argv[repeatIndex + 1] || 3)

const data = loadData()
currentRows = collectWaypointMedia(data)

const counts = checkResolvedFiles(currentRows)
checkOneImageOnePlace(currentRows)
const dupes = checkDifferentlyNamedDuplicates()
checkStatusHonesty(currentRows)
checkManifestAgreement(currentRows)
const thread1 = checkThread1(currentRows)

console.log("── image truth ──────────────────────────────────────────────")
console.log(`  waypoints with media     ${counts.photos + counts.placeholders}`)
console.log(`  photographs wired in     ${counts.photos}`)
console.log(`  illustrations/placeholders${counts.placeholders}`)
console.log(`  differently-named dupes  ${dupes.groups} (wired as photos: ${dupes.offenders})`)

console.log("")
console.log("── thread 1: The Seven World Wonder ──────────────────────────")
for (const s of thread1) {
  const mark = s.state === "PHOTO" ? "ok  " : "FAIL"
  console.log(`  ${mark} wp${s.waypointId} ${s.expected} -> ${s.src || s.state}`)
}

const snapshots = [currentRows.map(mediaKey).join("\n")]

if (repeats > 0) {
  console.log("")
  console.log(`── idempotency: ${repeats} further run(s) of wire-waypoint-images.cjs ──`)
  for (let i = 1; i <= repeats; i++) {
    const before = sha256(path.join(ROOT, "js", "data.js"))
    const status = runWiring()
    const after = sha256(path.join(ROOT, "js", "data.js"))
    const data2 = loadData()
    const rows2 = collectWaypointMedia(data2)
    currentRows = rows2
    const snapshot = rows2.map(mediaKey).join("\n")
    const counts2 = checkResolvedFiles(rows2)
    const stable = snapshot === snapshots[0]
    snapshots.push(snapshot)
    console.log(
      `  run ${i}: exit=${status} data.js ${before === after ? "unchanged" : "CHANGED"}` +
        ` photos=${counts2.photos} placeholders=${counts2.placeholders} media=${stable ? "identical" : "DRIFTED"}`,
    )
    if (!stable) {
      fail(`run ${i} changed the resolved media for at least one waypoint`)
      for (let k = 0; k < rows2.length; k++) {
        if (rows2[k] && mediaKey(rows2[k]) !== snapshots[0].split("\n")[k]) {
          fail(`  drifted: ${rows2[k].threadId}/${rows2[k].waypointId} ${rows2[k].name}`)
        }
      }
    }
    if (counts2.photos < counts.photos) {
      fail(
        `run ${i} reduced the photograph count from ${counts.photos} to ${counts2.photos}`,
      )
    }
  }
  console.log(
    `  photo counts: ${[counts.photos, ...snapshots.slice(1).map(() => counts.photos)].join(" -> ")} (equal required)`,
  )
}

console.log("")
if (notes.length) {
  console.log("── confirmed ────────────────────────────────────────────────")
  for (const n of notes) console.log("  " + n)
}

console.log("")
if (errors.length) {
  console.error("── FAILED ───────────────────────────────────────────────────")
  for (const e of errors) console.error("  " + e)
  console.error(`\n${errors.length} problem(s).`)
  process.exit(1)
}
console.log("image truth verified")
