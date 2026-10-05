/* Route verification — renders every route in jsdom and fails on a throw or an
   empty #app.

   There is no compiler here, so this is how a change to a renderer is proven not
   to have broken a page: it drives NASEEJ.route() over the whole route space and
   reports what each one painted. Point it at a working tree, not a build.

   Usage:
     npm install --no-save jsdom     # deliberately not a devDependency; see below
     node scripts/verify-routes.mjs
     node scripts/verify-routes.mjs --verbose   # every route, not just failures

   Why jsdom is not in package.json: the project has no runtime and no build
   dependency, and this harness is a maintenance tool rather than part of the
   build gate (scripts/build.cjs is that). `--no-save` keeps jsdom out of the
   manifest while still resolving for this run.

   What this can and cannot prove. jsdom has no layout engine and no images, so
   this proves behaviour and markup — a route that throws, or renders nothing.
   It proves nothing about geometry, responsive breakpoints or computed styles;
   those need a real browser. See the Verification section of AGENTS.md.       */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const VERBOSE = process.argv.includes("--verbose")

let JSDOM
try {
  ;({ JSDOM } = await import("jsdom"))
} catch {
  console.error(
    "verify-routes: jsdom is not installed.\n  npm install --no-save jsdom",
  )
  process.exit(2)
}

/* The order index.html loads them in. It is a hard contract (build.cjs enforces
   it), and the harness has to honour it or the renderers read a NASEEJ that
   navigation.js has not finished defining. */
const SCRIPTS = [
  "js/data.js",
  "js/navigation.js",
  "js/firebase.js",
  "js/pages.js",
  "js/auth.js",
  "js/app.js",
]

/* Setting window.location.hash and calling route() directly is deliberate:
   NASEEJ.navigate() writes the hash and waits for hashchange, which does not
   fire synchronously here, so every route would be reported as the previous
   one. */
function routesFor(data) {
  const routes = new Set(["#/home", "#/discover", "#/profile", "#/thread"])
  /* The threads are data.libraryThreads, not data.threads — there is no such
     array, and a harness that walks one silently verifies three routes and
     calls it a pass. The waypoints come from the getThread() helper, which is
     the seam the content is meant to be read through. */
  for (const entry of data.libraryThreads || []) {
    routes.add("#/thread/" + entry.id)
    for (const wp of data.getThread(entry.id).waypoints || []) {
      routes.add("#/place/" + entry.id + "/" + wp.id)
    }
  }
  /* The documented fallbacks. They must render rather than throw, and an
     unknown page must land on home rather than on a blank #app. */
  routes.add("#/nonsense")
  routes.add("#/thread/9999")
  routes.add("#/place/9999/9999")
  return [...routes].sort()
}

/* `resources: 'usable'` is deliberately off: with no server behind the fake
   origin it turns every <link> and <script src> into an ECONNREFUSED, which
   buries the one line that matters. The scripts are injected from disk below
   instead, so nothing needs fetching. */
const dom = new JSDOM(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), {
  url: "http://localhost:3000/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
})
const { window } = dom
/* mount() calls scrollTo(0, 0) on every navigation and jsdom has no layout, so
   it logs "Not implemented" per route. Stub it rather than drown the output. */
window.scrollTo = () => {}
window.scrollBy = () => {}
for (const rel of SCRIPTS) {
  const el = window.document.createElement("script")
  el.textContent = fs.readFileSync(path.join(ROOT, rel), "utf8")
  window.document.body.appendChild(el)
}
if (!window.NASEEJ || !window.NASEEJ.data) {
  console.error(
    "verify-routes: window.NASEEJ.data is missing — the scripts did not load.",
  )
  process.exit(2)
}

const failures = []
const results = []
for (const hash of routesFor(window.NASEEJ.data)) {
  window.location.hash = hash
  try {
    window.NASEEJ.route()
    const app = window.document.getElementById("app")
    const len = app ? app.innerHTML.length : 0
    if (!len) throw new Error("#app rendered nothing")
    results.push({ route: hash, page: window.NASEEJ.state.page, bytes: len })
  } catch (err) {
    failures.push({ route: hash, error: err.message })
  }
}

if (VERBOSE)
  for (const r of results)
    console.log(r.route + "  ->  " + r.page + "  " + r.bytes + " bytes")
console.log(
  "\nroutes rendered: " + results.length + ", failed: " + failures.length,
)
for (const f of failures) console.error("  FAIL " + f.route + ": " + f.error)
process.exit(failures.length ? 1 : 0)
