/* Naseej — static build.
   Backs `npm run build` / `npm run build --mode development`, and the
   `predeploy` hook in firebase.json.

   There is nothing to compile: the repository root is already the site. This
   stages the publishable files into dist/ so Firebase Hosting has a directory
   to upload.

   Ignores flags it does not understand (Vite's --mode, for example).

   Because there is no compiler, the build also acts as the project's only
   static check: it verifies that every file the site references exists, that
   the scripts parse, and that each one declares its side effects locally. A
   missing asset or a stray `import` in a classic script is a deploy-time
   surprise otherwise — both are cheap to catch here. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

/* Only these are published. Source-only and tooling files stay out of dist/,
   including firebase.json itself. */
const INCLUDE_FILES = ['index.html', 'robots.txt'];
const INCLUDE_DIRS = ['css', 'js', 'assets'];

/* Loaded in this order; each is a classic script, so a static `import` in any
   of them is a fatal page-load error rather than a build error. */
const SCRIPTS = ['js/data.js', 'js/navigation.js', 'js/firebase.js', 'js/pages.js', 'js/auth.js', 'js/app.js'];

const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function checkScripts() {
  let sources = {};
  for (const rel of SCRIPTS) {
    if (!exists(rel)) {
      errors.push('missing script: ' + rel);
      continue;
    }
    const src = read(rel);
    try {
      /* Parse only: the scripts need `window`/`document`, which the build has
         no business providing. */
      new vm.Script(src, { filename: rel });
    } catch (err) {
      errors.push(rel + ': ' + err.message);
      continue;
    }
    if (/^\s*import\s+[^(]/m.test(src) || /^\s*export\s/m.test(src)) {
      errors.push(rel + ': static import/export is not allowed in a classic script (use a dynamic import())');
    }
    sources[rel] = src;
  }

  /* A `const`/`let`/`function` at the top level of a classic script creates a
     binding that is NOT a property of window, so other files cannot see it.
     Wrap the body in an IIFE instead: every declaration then sits indented
     inside `(function (NASEEJ) { ... })`. */
  for (const rel of SCRIPTS) {
    if (!sources[rel]) continue;
    const lines = sources[rel].split('\n');
    const offender = lines.findIndex((l) => /^(const|let|var|function|class)\s+[A-Za-z_$]/.test(l));
    if (offender >= 0) {
      errors.push(rel + ':' + (offender + 1) + ': top-level "' + lines[offender].trim().split(/\s+/)[0] +
        '" would not be visible to other scripts — wrap the file in an IIFE');
    }
  }
  return sources;
}

function checkIndex(sources) {
  if (!exists('index.html')) {
    errors.push('missing index.html');
    return;
  }
  const html = read('index.html');

  const local = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
  for (const ref of local) {
    if (!exists(ref)) errors.push('index.html references a missing file: ' + ref);
  }

  /* Script order is a hard contract, not a preference. */
  const order = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  const expected = SCRIPTS.filter((s) => order.includes(s));
  const found = order.filter((s) => SCRIPTS.includes(s));
  if (expected.join(',') !== found.join(',')) {
    errors.push('index.html loads scripts out of order: ' + found.join(', ') + ' (expected ' + expected.join(', ') + ')');
  }
  for (const rel of SCRIPTS) {
    if (exists(rel) && !order.includes(rel)) errors.push('index.html does not load ' + rel);
  }
  return sources;
}

/* The renderers inline their colors rather than referencing var(), so the
   :root block is the registry that keeps them honest: every hex literal in a
   script has to be a registered token, otherwise it is a color nobody can find
   or restyle from one place. Alpha variants (rgba(...)) and 8-digit hexes are
   skipped -- they are derived tints, not palette entries. */
function checkColorTokens() {
  const css = read('css/styles.css');
  const registered = new Map();
  for (const m of css.matchAll(/(--color-[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})\b/g)) {
    registered.set(m[2].toUpperCase(), m[1]);
  }
  if (registered.size === 0) {
    errors.push('css/styles.css declares no --color-* tokens to validate against');
    return;
  }
  const orphans = new Map();
  for (const rel of SCRIPTS) {
    if (!exists(rel)) continue;
    for (const m of read(rel).matchAll(/#[0-9A-Fa-f]{6}\b/g)) {
      const hex = m[0].toUpperCase();
      if (registered.has(hex)) continue;
      if (!orphans.has(hex)) orphans.set(hex, new Set());
      orphans.get(hex).add(rel);
    }
  }
  for (const [hex, files] of orphans) {
    errors.push(
      'unregistered color ' + hex + ' used in ' + [...files].join(', ') +
        ' - add it to :root in css/styles.css'
    );
  }
  return registered.size;
}

/* Recursive: assets/places/<destination>/ holds one file per waypoint, so a
   checker that only listed the top level reported all 112 of those references
   as missing and failed a build whose data was already correct. Paths come back
   document-relative with forward slashes, the form data.js writes them in. */
function walkFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) out.push(...walkFiles(file));
    else out.push(path.relative(ROOT, file).split(path.sep).join('/'));
  }
  return out;
}

/* Files that are on disk but must not be referenced: one file cannot be a unique
   photograph of two places, so the duplicate-byte copies are kept for the record
   and photo-manifest.json lists them by name. Everything non-image (the README,
   the manifests, the incoming-photo checklist) is documentation rather than an
   orphan, and warning about it would bury a real orphan in noise. */
function intentionallyUnreferenced() {
  const out = new Set();
  const manifest = 'assets/places/photo-manifest.json';
  if (!exists(manifest)) return out;
  let parsed;
  try {
    parsed = JSON.parse(read(manifest));
  } catch {
    return out;
  }
  for (const rel of parsed.skipped_duplicate_byte_files || []) out.add(rel);
  return out;
}

/* Asset paths live in data.js and in the renderers, so collect every
   "assets/..." string and confirm the file is on disk. */
function checkAssets() {
  const dir = path.join(ROOT, 'assets');
  if (!fs.existsSync(dir)) {
    errors.push('missing assets/ directory');
    return;
  }
  const onDisk = walkFiles(dir);
  const present = new Set(onDisk);
  const seen = new Set();
  for (const rel of ['index.html', ...SCRIPTS]) {
    if (!exists(rel)) continue;
    for (const m of read(rel).matchAll(/["'](assets\/[^"']+)["']/g)) {
      const ref = m[1];
      seen.add(ref);
      if (!present.has(ref)) errors.push(rel + ' references a missing asset: ' + ref);
    }
  }
  const exempt = intentionallyUnreferenced();
  for (const f of onDisk) {
    if (seen.has(f) || exempt.has(f)) continue;
    if (!IMAGE_EXT.test(path.extname(f))) continue;
    warnings.push('unused asset (not referenced by any script): ' + f);
  }
  checkAssetTypes(onDisk);
}

/* Extension/content agreement.

   Firebase Hosting derives Content-Type from the file extension, so an asset
   whose bytes disagree with its name is served with the wrong header on every
   request. Browsers sniff images and cope, which is exactly why this goes
   unnoticed until something else reads the file — an image pipeline, a
   validator, a cache. This repo had eleven files named .jpg holding PNG data.

   Cheap to check and impossible to check later, so it is a build error rather
   than a note. An LFS pointer smudged into the working tree is reported too,
   because a pointer served as an image is a broken image with no local symptom
   until the clone that lacks the object. */
const SIGNATURES = [
  { ext: '.png', test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: '.jpg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.gif', test: (b) => b.length > 6 && b.slice(0, 3).toString('latin1') === 'GIF' },
  { ext: '.webp', test: (b) => b.length > 12 && b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP' },
  { ext: '.svg', test: (b) => /<svg[\s>]/i.test(b.slice(0, 200).toString('utf8')) },
];

const IMAGE_EXT = /\.(png|jpg|jpeg|gif|webp|svg)$/i;

function checkAssetTypes(relFiles) {
  for (const rel of relFiles) {
    const ext = path.extname(rel).toLowerCase();
    const known = SIGNATURES.find((s) => s.ext === ext);
    if (!known) continue; /* not an image type we can verify */

    const buf = fs.readFileSync(path.join(ROOT, rel));
    const head = buf.slice(0, 120).toString('utf8');
    if (/^version https?:\/\/git-lfs\.github\.com\/spec\/v1/.test(head)) {
      errors.push(rel + ' is an unresolved Git LFS pointer, not image data');
      continue;
    }
    if (!known.test(buf)) {
      const actual = SIGNATURES.find((s) => s.test(buf));
      errors.push(
        rel + ' does not contain ' + ext + ' data' + (actual ? ' — it looks like ' + actual.ext : '')
      );
    }
  }
}

/* No bundler means no bundler diagnostics, but the utility-class coverage is
   checked where it is authoritative: by rendering the pages and comparing the
   emitted class names against css/styles.css. That lives in the verification
   harness, not here — the markup is built by string concatenation, so a class
   list cannot be recovered from the source with enough confidence to fail a
   deploy on it. */

let files = 0;
let bytes = 0;

function copyInto(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) copyInto(path.join(src, entry), path.join(dest, entry));
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  files++;
  bytes += fs.statSync(src).size;
}

const sources = checkIndex(checkScripts());
checkAssets();
const tokenCount = checkColorTokens() || 0;

for (const w of warnings) console.warn('warning: ' + w);

if (errors.length > 0) {
  for (const e of errors) console.error('error: ' + e);
  console.error('\nbuild failed — ' + errors.length + ' problem(s). dist/ was not written.');
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const name of INCLUDE_FILES) {
  const src = path.join(ROOT, name);
  if (fs.existsSync(src)) copyInto(src, path.join(OUT, name));
  else console.warn('warning: missing ' + name + ' — skipped');
}
for (const dir of INCLUDE_DIRS) {
  const src = path.join(ROOT, dir);
  if (!fs.existsSync(src)) {
    console.warn('warning: missing ' + dir + '/ — skipped');
    continue;
  }
  copyInto(src, path.join(OUT, dir));
}

console.log('built dist/ — ' + files + ' files, ' + (bytes / 1048576).toFixed(2) + ' MB');
console.log('checks passed: ' + SCRIPTS.length + ' scripts (parse + classic-script rules), index.html references and script order, asset paths, ' + tokenCount + ' color tokens');
